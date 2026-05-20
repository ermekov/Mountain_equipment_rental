from datetime import datetime

from ..extensions import db


class Favorite(db.Model):
    __tablename__ = "favorites"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    equipment_id = db.Column(db.Integer, db.ForeignKey("equipment.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="favorites")
    equipment = db.relationship("Equipment", back_populates="favorites")

    __table_args__ = (
        db.UniqueConstraint("user_id", "equipment_id", name="uq_user_equipment_favorite"),
    )

    def __repr__(self):
        return f"<Favorite user={self.user_id} equipment={self.equipment_id}>"
