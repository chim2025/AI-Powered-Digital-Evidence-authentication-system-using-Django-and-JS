
from .video_forensics_main import RealVideoForensics
video_path='backend/evidencemodule/ai_models/video_section/goodluckadded1.mp4'
def executors(video_path):
    forensic=RealVideoForensics(video_path)
    result=forensic.run()
    return result


