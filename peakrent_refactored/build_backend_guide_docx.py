from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import re
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(r"C:\Users\Erasyl\Desktop\Mountain_rental2\peakrent_diploma\peakrent_refactored")
SOURCE_MD = ROOT / "BACKEND_KZ_GUIDE.md"
OUTPUT_DOCX = ROOT / "BACKEND_KZ_GUIDE.docx"

HEADING_RE = re.compile(r"^(#{1,4})\s+(.*)$")
ORDERED_RE = re.compile(r"^\d+\.\s+(.*)$")
INLINE_CODE_RE = re.compile(r"`([^`]+)`")


def run_xml(
    text: str,
    *,
    size: int = 22,
    color: str = "1F2937",
    bold: bool = False,
    font: str = "Calibri",
    preserve_space: bool = False,
) -> str:
    attrs = ' xml:space="preserve"' if preserve_space or text.startswith(" ") or text.endswith(" ") else ""
    parts = [
        "<w:r>",
        "<w:rPr>",
        f'<w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:cs="{font}"/>',
        f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>',
        f'<w:color w:val="{color}"/>',
    ]
    if bold:
        parts.append("<w:b/><w:bCs/>")
    parts.extend(["</w:rPr>", f"<w:t{attrs}>{escape(text)}</w:t>", "</w:r>"])
    return "".join(parts)


def inline_runs(text: str, *, size: int = 22, color: str = "1F2937", bold: bool = False) -> str:
    runs: list[str] = []
    last = 0
    for match in INLINE_CODE_RE.finditer(text):
        if match.start() > last:
            runs.append(run_xml(text[last : match.start()], size=size, color=color, bold=bold))
        runs.append(run_xml(match.group(1), size=size - 1, color="0F4C81", font="Consolas"))
        last = match.end()
    if last < len(text):
        runs.append(run_xml(text[last:], size=size, color=color, bold=bold))
    return "".join(runs) if runs else run_xml(text, size=size, color=color, bold=bold)


def paragraph_xml(
    runs: str,
    *,
    align: str = "left",
    before: int = 0,
    after: int = 120,
    line: int = 300,
    keep_next: bool = False,
    num_id: int | None = None,
    left: int | None = None,
    hanging: int | None = None,
    shading: str | None = None,
    border_left: str | None = None,
    border_size: int = 10,
) -> str:
    ppr = [
        "<w:pPr>",
        f'<w:jc w:val="{align}"/>',
        f'<w:spacing w:before="{before}" w:after="{after}" w:line="{line}" w:lineRule="auto"/>',
    ]
    if keep_next:
        ppr.append("<w:keepNext/>")
    if num_id is not None:
        ppr.append(f"<w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"{num_id}\"/></w:numPr>")
    if left is not None or hanging is not None:
        attrs: list[str] = []
        if left is not None:
            attrs.append(f'w:left="{left}"')
        if hanging is not None:
            attrs.append(f'w:hanging="{hanging}"')
        ppr.append(f"<w:ind {' '.join(attrs)}/>")
    if shading:
        ppr.append(f'<w:shd w:val="clear" w:color="auto" w:fill="{shading}"/>')
    if border_left:
        ppr.append(
            "<w:pBdr>"
            f'<w:left w:val="single" w:sz="{border_size}" w:space="0" w:color="{border_left}"/>'
            "</w:pBdr>"
        )
    ppr.append("</w:pPr>")
    return "<w:p>" + "".join(ppr) + runs + "</w:p>"


def spacer(after: int = 80) -> str:
    return paragraph_xml("", after=after)


def heading_xml(level: int, text: str, *, cover_done: bool) -> str:
    content = inline_runs(text, size=34 if level == 1 else 28 if level == 2 else 24 if level == 3 else 22, color="0F3D5E", bold=True)
    if level == 1 and not cover_done:
        return paragraph_xml(content, align="center", before=240, after=240, line=360, keep_next=True)
    if level == 2:
        return paragraph_xml(content, before=220, after=120, line=320, keep_next=True)
    if level == 3:
        return paragraph_xml(content, before=150, after=80, line=300, keep_next=True)
    return paragraph_xml(inline_runs(text, size=22, color="14567B", bold=True), before=90, after=50, line=290, keep_next=True)


def body_xml(text: str) -> str:
    return paragraph_xml(inline_runs(text), align="both", after=90, line=320)


def note_xml(text: str) -> str:
    return paragraph_xml(
        inline_runs(text, size=21, color="0F4C81"),
        align="both",
        before=30,
        after=110,
        line=300,
        left=220,
        shading="EEF8FF",
        border_left="0EA5E9",
        border_size=18,
    )


def code_block_xml(lines: list[str]) -> list[str]:
    blocks: list[str] = []
    if not lines:
        return blocks
    for index, line in enumerate(lines):
        blocks.append(
            paragraph_xml(
                run_xml(line or " ", size=18, color="243447", font="Consolas", preserve_space=True),
                after=20 if index < len(lines) - 1 else 100,
                line=260,
                left=260,
                shading="F5F9FC",
                border_left="7DBBE6",
                border_size=12,
            )
        )
    return blocks


def gather_normal_paragraph(lines: list[str], start: int) -> tuple[str, int]:
    collected: list[str] = []
    index = start
    while index < len(lines):
        stripped = lines[index].strip()
        if not stripped:
            break
        if (
            stripped == "---"
            or stripped.startswith("```")
            or stripped.startswith("> ")
            or stripped.startswith("- ")
            or HEADING_RE.match(stripped)
            or ORDERED_RE.match(stripped)
        ):
            break
        collected.append(stripped)
        index += 1
    return " ".join(collected), index


def build_document_body(markdown_text: str) -> str:
    lines = markdown_text.splitlines()
    blocks: list[str] = []
    i = 0
    cover_done = False

    while i < len(lines):
        stripped = lines[i].strip()
        if not stripped:
            i += 1
            continue

        if stripped == "---":
            blocks.append(spacer(60))
            i += 1
            continue

        heading_match = HEADING_RE.match(stripped)
        if heading_match:
            level = len(heading_match.group(1))
            text = heading_match.group(2).strip()
            blocks.append(heading_xml(level, text, cover_done=cover_done))
            if level == 1 and not cover_done:
                cover_done = True
            i += 1
            continue

        if stripped.startswith("```"):
            code_lines: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i].rstrip("\n"))
                i += 1
            if i < len(lines):
                i += 1
            blocks.extend(code_block_xml(code_lines))
            continue

        if stripped.startswith("> "):
            note_lines: list[str] = []
            while i < len(lines) and lines[i].strip().startswith("> "):
                note_lines.append(lines[i].strip()[2:].strip())
                i += 1
            blocks.append(note_xml(" ".join(note_lines)))
            continue

        if stripped.startswith("- "):
            while i < len(lines) and lines[i].strip().startswith("- "):
                item = lines[i].strip()[2:].strip()
                blocks.append(
                    paragraph_xml(
                        inline_runs(item),
                        align="both",
                        after=60,
                        line=300,
                        num_id=1,
                    )
                )
                i += 1
            continue

        ordered_match = ORDERED_RE.match(stripped)
        if ordered_match:
            while i < len(lines):
                current = ORDERED_RE.match(lines[i].strip())
                if not current:
                    break
                blocks.append(
                    paragraph_xml(
                        inline_runs(current.group(1).strip()),
                        align="both",
                        after=60,
                        line=300,
                        num_id=2,
                    )
                )
                i += 1
            continue

        paragraph, i = gather_normal_paragraph(lines, i)
        if paragraph:
            blocks.append(body_xml(paragraph))

    blocks.append(
        "<w:sectPr>"
        "<w:pgSz w:w=\"11906\" w:h=\"16838\"/>"
        "<w:pgMar w:top=\"1134\" w:right=\"1134\" w:bottom=\"1134\" w:left=\"1134\" w:header=\"708\" w:footer=\"708\" w:gutter=\"0\"/>"
        "</w:sectPr>"
    )
    return "".join(blocks)


def build_document_xml(markdown_text: str) -> str:
    body = build_document_body(markdown_text)
    return (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<w:document xmlns:wpc=\"http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas\" "
        "xmlns:mc=\"http://schemas.openxmlformats.org/markup-compatibility/2006\" "
        "xmlns:o=\"urn:schemas-microsoft-com:office:office\" "
        "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" "
        "xmlns:m=\"http://schemas.openxmlformats.org/officeDocument/2006/math\" "
        "xmlns:v=\"urn:schemas-microsoft-com:vml\" "
        "xmlns:wp14=\"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing\" "
        "xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" "
        "xmlns:w10=\"urn:schemas-microsoft-com:office:word\" "
        "xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" "
        "xmlns:w14=\"http://schemas.microsoft.com/office/word/2010/wordml\" "
        "xmlns:wpg=\"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup\" "
        "xmlns:wpi=\"http://schemas.microsoft.com/office/word/2010/wordprocessingInk\" "
        "xmlns:wne=\"http://schemas.microsoft.com/office/word/2006/wordml\" "
        "xmlns:wps=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\" "
        "mc:Ignorable=\"w14 wp14\">"
        f"<w:body>{body}</w:body></w:document>"
    )


CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""


ROOT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""


DOC_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
"""


SETTINGS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
  <w:characterSpacingControl w:val="doNotCompress"/>
</w:settings>
"""


STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="kk-KZ"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="300" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>
"""


NUMBERING_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:nsid w:val="1F1F1F1F"/>
    <w:multiLevelType w:val="singleLevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
      </w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:nsid w:val="2F2F2F2F"/>
    <w:multiLevelType w:val="singleLevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>
  <w:num w:numId="2">
    <w:abstractNumId w:val="1"/>
  </w:num>
</w:numbering>
"""


def core_xml() -> str:
    ts = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>PeakRent.kz Backend Guide</dc:title>
  <dc:subject>Kazakh backend explanation</dc:subject>
  <dc:creator>OpenAI Codex</dc:creator>
  <cp:keywords>PeakRent, backend, Flask, PostgreSQL, guide</cp:keywords>
  <dc:description>PeakRent.kz жобасының backend бөлігін қазақша түсіндіретін құжат</dc:description>
  <cp:lastModifiedBy>OpenAI Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{ts}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{ts}</dcterms:modified>
</cp:coreProperties>
"""


APP_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>PeakRent.kz</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>
"""


def build_docx() -> Path:
    markdown_text = SOURCE_MD.read_text(encoding="utf-8")
    document_xml = build_document_xml(markdown_text)
    with ZipFile(OUTPUT_DOCX, "w", compression=ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES)
        zf.writestr("_rels/.rels", ROOT_RELS)
        zf.writestr("docProps/core.xml", core_xml())
        zf.writestr("docProps/app.xml", APP_XML)
        zf.writestr("word/document.xml", document_xml)
        zf.writestr("word/styles.xml", STYLES_XML)
        zf.writestr("word/settings.xml", SETTINGS_XML)
        zf.writestr("word/numbering.xml", NUMBERING_XML)
        zf.writestr("word/_rels/document.xml.rels", DOC_RELS)
    return OUTPUT_DOCX


if __name__ == "__main__":
    print(build_docx())
