import zipfile
import os
import xml.etree.ElementTree as ET

def extract_docx_metadata(filepath):
    if not os.path.isfile(filepath) or not filepath.endswith('.docx'):
        raise ValueError("Invalid DOCX file.")

    metadata = {}
    with zipfile.ZipFile(filepath) as docx:
        core_props = 'docProps/core.xml'
        app_props = 'docProps/app.xml'

        if core_props in docx.namelist():
            tree = ET.fromstring(docx.read(core_props))
            for elem in tree:
                tag = elem.tag.split('}')[-1]
                metadata[tag] = elem.text

        if app_props in docx.namelist():
            tree = ET.fromstring(docx.read(app_props))
            for elem in tree:
                tag = elem.tag.split('}')[-1]
                metadata[tag] = elem.text

    return metadata
