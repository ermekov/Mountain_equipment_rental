from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app, g
from sqlalchemy import or_
from werkzeug.security import generate_password_hash, check_password_hash

from ..extensions import db
from ..models import User, OTPCode
from ..utils.auth import make_token, login_required
from ..services.sms_service import SMSService
from ..services.email_service import EmailService

auth_bp = Blueprint("auth", __name__)


def _normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if digits.startswith("8"):
        digits = "7" + digits[1:]
    if digits and not digits.startswith("7"):
        digits = "7" + digits
    return f"+{digits}" if digits else ""


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _find_valid_otp(identifier: str, code: str):
    return (
        OTPCode.query
        .filter_by(phone=identifier, code=code, used=False)
        .filter(OTPCode.expires_at > datetime.utcnow())
        .first()
    )


@auth_bp.route("/send-otp", methods=["POST"])
def send_otp():
    data = request.get_json() or {}
    email = _normalize_email(data.get("email", ""))
    phone = _normalize_phone(data.get("phone", "").strip())
    identifier = email or phone

    if not identifier:
        return jsonify({"error": "Field 'email' is required"}), 400

    if email and ("@" not in email or "." not in email.split("@")[-1]):
        return jsonify({"error": "Invalid email format"}), 400

    if not email:
        digits = phone.replace("+", "").replace(" ", "").replace("-", "")
        if not digits.isdigit() or len(digits) < 10:
            return jsonify({"error": "Неверный формат телефона. Используйте +77XXXXXXXXX"}), 400

    code = SMSService.generate_otp()
    OTPCode.query.filter_by(phone=identifier, used=False).delete()

    otp = OTPCode(
        phone=identifier,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.session.add(otp)

    delivered = EmailService.send_otp(email, code) if email else SMSService.send_otp(phone, code)
    if not delivered:
        db.session.rollback()
        return jsonify({"error": "Failed to send verification code"}), 502

    db.session.commit()
    response = {"message": "OTP отправлен на " + identifier}

    if current_app.config.get("DEV_MODE", True):
        response["dev_code"] = code

    return jsonify(response), 200


@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data  = request.get_json() or {}
    phone = _normalize_phone(data.get("phone", "").strip())
    email = _normalize_email(data.get("email", ""))
    code = data.get("code", "").strip()
    identifier = email or phone

    if not identifier or not code:
        return jsonify({"error": "Fields 'email/phone' and 'code' are required"}), 400

    otp = _find_valid_otp(identifier, code)

    if not otp:
        return jsonify({"error": "Неверный или истёкший код подтверждения"}), 400

    otp.used = True

    user = User.query.filter_by(email=email).first() if email else User.query.filter_by(phone=phone).first()
    if not user:
        if email:
          user = User(email=email, name=email.split("@")[0], role="user")
        else:
          user = User(phone=phone, name=phone[-4:])
        db.session.add(user)

    db.session.commit()

    token = make_token(user.id, user.role)

    return jsonify({
        "access_token": token,
        "user":         user.to_dict(),
    }), 200


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = _normalize_phone(data.get("phone", "").strip())
    password = data.get("password", "")
    code = data.get("code", "").strip()

    if not name or not email or not phone or not password or not code:
        return jsonify({"error": "Fields 'name', 'email', 'phone', 'password' and 'code' are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must contain at least 6 characters"}), 400

    otp = _find_valid_otp(email, code)
    if not otp:
        return jsonify({"error": "Invalid or expired verification code"}), 400

    existing_by_email = User.query.filter(User.email == email).first()
    existing_by_phone = User.query.filter(User.phone == phone).first()

    if existing_by_email and existing_by_email.role != "user":
        return jsonify({"error": "Email is already used"}), 409
    if existing_by_phone and existing_by_phone.role != "user":
        return jsonify({"error": "Phone is already used"}), 409

    user = existing_by_phone or existing_by_email
    if user and user.password:
        return jsonify({"error": "User already exists. Please sign in"}), 409

    if user is None:
        user = User(role="user")
        db.session.add(user)

    if existing_by_email and existing_by_phone and existing_by_email.id != existing_by_phone.id:
        return jsonify({"error": "Email or phone is already linked to another account"}), 409

    otp.used = True
    user.name = name
    user.email = email
    user.phone = phone
    user.password = generate_password_hash(password)

    db.session.commit()

    token = make_token(user.id, user.role)
    return jsonify({
        "access_token": token,
        "user": user.to_dict(),
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    login_value = data.get("login", "").strip()
    password = data.get("password", "")
    normalized_phone = _normalize_phone(login_value)

    if not login_value or not password:
        return jsonify({"error": "Fields 'login' and 'password' are required"}), 400

    user = User.query.filter(
        or_(User.email == login_value.lower(), User.phone == normalized_phone)
    ).first()

    if not user or not user.password:
        return jsonify({"error": "User not found"}), 401

    if not check_password_hash(user.password, password):
        return jsonify({"error": "Incorrect password"}), 401

    token = make_token(user.id, user.role)
    return jsonify({
        "access_token": token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def get_me():
    return jsonify(g.user.to_dict()), 200


@auth_bp.route("/me", methods=["PUT"])
@login_required
def update_me():
    data = request.get_json() or {}

    if "name" in data:
        name = data["name"].strip()
        if len(name) < 1:
            return jsonify({"error": "Имя не может быть пустым"}), 400
        g.user.name = name

    db.session.commit()
    return jsonify(g.user.to_dict()), 200
