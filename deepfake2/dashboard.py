"""
Streamlit Dashboard for Deepfake Detection System
User-friendly web interface for forensic analysts

Author: Gbotemi
Date: November 2025
Phase: 9 - Web Interface
"""

import streamlit as st
import requests
import time
import json
from pathlib import Path
from PIL import Image
import pandas as pd
from datetime import datetime
import io

# Page configuration
st.set_page_config(
    page_title="Deepfake Detection System",
    page_icon="🎥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# API Configuration
API_BASE_URL = "http://localhost:8000"
API_KEY = "your-secret-api-key-change-this"
HEADERS = {"X-API-Key": API_KEY}

# Custom CSS for better styling
st.markdown("""
<style>
    .big-font {
        font-size: 50px !important;
        font-weight: bold;
    }
    .verdict-fake {
        color: #ff4444;
        font-size: 40px;
        font-weight: bold;
        text-align: center;
        padding: 20px;
        border: 3px solid #ff4444;
        border-radius: 10px;
        background-color: #ffe6e6;
    }
    .verdict-real {
        color: #44ff44;
        font-size: 40px;
        font-weight: bold;
        text-align: center;
        padding: 20px;
        border: 3px solid #44ff44;
        border-radius: 10px;
        background-color: #e6ffe6;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 20px;
        border-radius: 10px;
        margin: 10px 0;
    }
</style>
""", unsafe_allow_html=True)


def check_api_health():
    """Check if API server is running"""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=2)
        return response.status_code == 200
    except:
        return False


def upload_video(video_file):
    """Upload video to API"""
    try:
        files = {'file': (video_file.name, video_file, 'video/mp4')}
        response = requests.post(
            f"{API_BASE_URL}/api/upload",
            files=files,
            headers=HEADERS
        )
        
        if response.status_code == 200:
            return response.json()['job_id']
        else:
            st.error(f"Upload failed: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error uploading video: {str(e)}")
        return None


def get_job_status(job_id):
    """Get job status from API"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/jobs/{job_id}",
            headers=HEADERS
        )
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None


def get_results(job_id):
    """Get analysis results from API"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/results/{job_id}",
            headers=HEADERS
        )
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None


def get_heatmap_image(job_id, frame_id):
    """Download heatmap image from API"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/heatmap/{job_id}/{frame_id}",
            headers=HEADERS
        )
        if response.status_code == 200:
            return Image.open(io.BytesIO(response.content))
        return None
    except:
        return None


def display_verdict(prediction, confidence):
    """Display verdict with appropriate styling"""
    if prediction == "FAKE":
        st.markdown(f"""
        <div class="verdict-fake">
            🔴 DEEPFAKE DETECTED<br>
            Confidence: {confidence*100:.1f}%
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div class="verdict-real">
            🟢 AUTHENTIC VIDEO<br>
            Confidence: {confidence*100:.1f}%
        </div>
        """, unsafe_allow_html=True)


def display_statistics(results):
    """Display statistics in a nice layout"""
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            label="Total Faces Analyzed",
            value=results['fake_face_count'] + results['real_face_count']
        )
    
    with col2:
        st.metric(
            label="Fake Faces",
            value=results['fake_face_count'],
            delta=f"{results['fake_face_percentage']:.1f}%",
            delta_color="inverse"
        )
    
    with col3:
        st.metric(
            label="Real Faces",
            value=results['real_face_count']
        )
    
    with col4:
        st.metric(
            label="Processing Time",
            value=f"{results['processing_time']:.1f}s"
        )


def display_heatmaps(job_id, heatmaps):
    """Display heatmap gallery"""
    st.subheader("🎨 Suspicious Frame Analysis")
    
    if not heatmaps:
        st.info("No heatmaps available")
        return
    
    # Display in rows of 3
    num_cols = 3
    for i in range(0, len(heatmaps), num_cols):
        cols = st.columns(num_cols)
        
        for j, col in enumerate(cols):
            idx = i + j
            if idx < len(heatmaps):
                frame_id = heatmaps[idx]
                
                with col:
                    # Try to load and display heatmap
                    img = get_heatmap_image(job_id, frame_id)
                    
                    if img:
                        st.image(img, caption=frame_id, use_container_width=True)
                        
                        # Add expand button
                        if st.button(f"🔍 View Full Size", key=f"expand_{frame_id}"):
                            st.session_state['selected_heatmap'] = (job_id, frame_id)
                    else:
                        st.error(f"Could not load {frame_id}")


def main():
    """Main dashboard application"""
    
    # Header
    st.title("🎥 Deepfake Detection System")
    st.markdown("**Forensic Video Analysis for Black Faces**")
    st.markdown("---")
    
    # Sidebar
    with st.sidebar:
        st.header("ℹ️ System Info")
        
        # API status
        if check_api_health():
            st.success("✅ API Server: Online")
        else:
            st.error("❌ API Server: Offline")
            st.warning("Please start the API server:\n```python api_main.py```")
            return
        
        st.markdown("---")
        
        # Navigation
        st.header("📋 Navigation")
        page = st.radio(
            "Select Page",
            ["🏠 Home", "📤 Upload & Analyze", "📜 History", "📊 Statistics"]
        )
        
        st.markdown("---")
        
        # Quick stats
        st.header("📈 Quick Stats")
        try:
            response = requests.get(f"{API_BASE_URL}/api/jobs?limit=100", headers=HEADERS)
            if response.status_code == 200:
                jobs = response.json()['jobs']
                completed = [j for j in jobs if j['status'] == 'completed']
                
                st.metric("Total Analyses", len(jobs))
                st.metric("Completed", len(completed))
                st.metric("Success Rate", f"{len(completed)/len(jobs)*100:.1f}%" if jobs else "N/A")
        except:
            st.info("Stats unavailable")
    
    # Main content based on selected page
    if page == "🏠 Home":
        show_home_page()
    elif page == "📤 Upload & Analyze":
        show_upload_page()
    elif page == "📜 History":
        show_history_page()
    elif page == "📊 Statistics":
        show_statistics_page()


def show_home_page():
    """Home page with welcome message and instructions"""
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.header("Welcome to the Deepfake Detection System")
        
        st.markdown("""
        This system uses advanced AI to detect deepfake videos, specifically optimized 
        for Black faces.
        
        ### 🎯 Key Features
        
        - **High Accuracy**: 99.77% accuracy on real Black faces
        - **Low False Positives**: Only 0.23% false positive rate
        - **Visual Explanations**: Grad-CAM heatmaps show exactly where artifacts are detected
        - **Fast Processing**: Results in under 2 minutes
        - **Forensic-Grade**: Suitable for legal proceedings
        
        ### 📖 How to Use
        
        1. Go to **Upload & Analyze** page
        2. Upload your video file (MP4, AVI, MOV)
        3. Wait for processing (progress bar will show status)
        4. View results with confidence score and heatmaps
        5. Download PDF report for documentation
        
        ### 🔍 Understanding Results
        
        - **Confidence > 80%**: High confidence - trust the result
        - **Confidence 60-80%**: Medium - consider manual review
        - **Confidence < 60%**: Low - uncertain, needs expert review
        """)
    
    with col2:
        st.image("https://via.placeholder.com/400x300/1f77b4/ffffff?text=Deepfake+Detection", 
                 caption="AI-Powered Video Analysis")
        
        st.info("""
        **System Status**
        
        ✅ Model: EfficientNet-B4  
        ✅ Accuracy: 93.57%  
        ✅ Processing: GPU Accelerated  
        ✅ Security: API Key Protected
        """)


def show_upload_page():
    """Upload and analysis page"""
    
    st.header("📤 Upload & Analyze Videos")
    
    # Tab selection for single or batch
    tab1, tab2 = st.tabs(["📄 Single Video", "📦 Batch Upload (Multiple Videos)"])
    
    with tab1:
        show_single_upload()
    
    with tab2:
        show_batch_upload()


def show_single_upload():
    """Single video upload"""
    st.subheader("Upload Single Video")
    
    # File uploader
    uploaded_file = st.file_uploader(
        "Choose a video file",
        type=['mp4', 'avi', 'mov'],
        help="Upload a video file for deepfake detection",
        key="single_upload"
    )
    
    if uploaded_file is not None:
        # Display video info
        st.success(f"✅ File loaded: {uploaded_file.name}")
        
        col1, col2 = st.columns([3, 1])
        
        with col1:
            st.video(uploaded_file)
        
        with col2:
            file_size = len(uploaded_file.getvalue()) / (1024 * 1024)
            st.metric("File Size", f"{file_size:.1f} MB")
            
            if st.button("🚀 Start Analysis", type="primary", use_container_width=True):
                analyze_video(uploaded_file)


def show_batch_upload():
    """Batch video upload"""
    st.subheader("Upload Multiple Videos")
    
    # Multiple file uploader
    uploaded_files = st.file_uploader(
        "Choose video files (you can select multiple)",
        type=['mp4', 'avi', 'mov'],
        accept_multiple_files=True,
        help="Select multiple video files for batch processing",
        key="batch_upload"
    )
    
    if uploaded_files:
        st.success(f"✅ {len(uploaded_files)} videos loaded")
        
        # Display files in a table
        st.subheader("📋 Videos to Analyze")
        
        files_data = []
        for i, file in enumerate(uploaded_files, 1):
            file_size = len(file.getvalue()) / (1024 * 1024)
            files_data.append({
                "#": i,
                "Filename": file.name,
                "Size (MB)": f"{file_size:.1f}"
            })
        
        df = pd.DataFrame(files_data)
        st.dataframe(df, use_container_width=True)
        
        # Batch processing options
        col1, col2 = st.columns(2)
        
        with col1:
            process_mode = st.radio(
                "Processing Mode",
                ["Sequential (one at a time)", "Parallel (all at once)"],
                help="Sequential is more stable, Parallel is faster"
            )
        
        with col2:
            total_size = sum(len(f.getvalue()) for f in uploaded_files) / (1024 * 1024)
            st.metric("Total Size", f"{total_size:.1f} MB")
            st.metric("Estimated Time", f"{len(uploaded_files) * 5}s")
        
        st.markdown("---")
        
        # Start batch analysis button
        if st.button("🚀 Start Batch Analysis", type="primary", use_container_width=True):
            if process_mode.startswith("Sequential"):
                analyze_batch_sequential(uploaded_files)
            else:
                analyze_batch_parallel(uploaded_files)


def analyze_video(video_file):
    """Process video analysis workflow"""
    
    # Upload video
    with st.spinner("Uploading video..."):
        job_id = upload_video(video_file)
    
    if not job_id:
        st.error("Failed to upload video")
        return
    
    st.success(f"✅ Video uploaded successfully!")
    st.info(f"Job ID: `{job_id}`")
    
    # Progress tracking
    st.subheader("⏳ Processing Video")
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    # Poll for status
    while True:
        status_data = get_job_status(job_id)
        
        if not status_data:
            st.error("Failed to get job status")
            break
        
        status = status_data['status']
        progress = status_data['progress']
        
        # Update progress
        progress_bar.progress(progress / 100)
        status_text.text(f"Status: {status.title()} - {progress}%")
        
        if status == 'completed':
            st.success("✅ Analysis Complete!")
            display_results(job_id)
            break
        
        elif status == 'failed':
            st.error(f"❌ Analysis failed: {status_data.get('error_message', 'Unknown error')}")
            break
        
        time.sleep(2)


def analyze_batch_sequential(video_files):
    """Process videos one by one"""
    
    st.subheader("📊 Batch Processing Progress")
    
    # Overall progress
    overall_progress = st.progress(0)
    overall_status = st.empty()
    
    results_list = []
    
    for i, video_file in enumerate(video_files, 1):
        overall_status.text(f"Processing video {i} of {len(video_files)}: {video_file.name}")
        
        # Create expandable section for this video
        with st.expander(f"📹 {video_file.name}", expanded=True):
            # Upload video
            with st.spinner("Uploading..."):
                job_id = upload_video(video_file)
            
            if not job_id:
                st.error(f"❌ Failed to upload {video_file.name}")
                continue
            
            st.info(f"Job ID: `{job_id}`")
            
            # Progress for this video
            video_progress = st.progress(0)
            video_status = st.empty()
            
            # Poll for status
            while True:
                status_data = get_job_status(job_id)
                
                if not status_data:
                    st.error("Failed to get job status")
                    break
                
                status = status_data['status']
                progress = status_data['progress']
                
                video_progress.progress(progress / 100)
                video_status.text(f"Status: {status.title()} - {progress}%")
                
                if status == 'completed':
                    st.success("✅ Complete!")
                    
                    # Get results
                    results = get_results(job_id)
                    if results:
                        results_list.append({
                            'filename': video_file.name,
                            'job_id': job_id,
                            'prediction': results['prediction'],
                            'confidence': results['confidence'],
                            'results': results
                        })
                        
                        # Mini summary
                        col1, col2 = st.columns(2)
                        with col1:
                            if results['prediction'] == 'FAKE':
                                st.error(f"🔴 FAKE ({results['confidence']*100:.1f}%)")
                            else:
                                st.success(f"🟢 REAL ({results['confidence']*100:.1f}%)")
                        with col2:
                            st.metric("Fake Faces", f"{results['fake_face_count']} ({results['fake_face_percentage']:.1f}%)")
                    break
                
                elif status == 'failed':
                    st.error(f"❌ Failed: {status_data.get('error_message', 'Unknown error')}")
                    break
                
                time.sleep(2)
        
        # Update overall progress
        overall_progress.progress(i / len(video_files))
    
    # Display batch summary
    overall_status.text("✅ All videos processed!")
    display_batch_summary(results_list)


def analyze_batch_parallel(video_files):
    """Upload all videos at once and track them"""
    
    st.subheader("📊 Batch Processing Progress (Parallel)")
    
    # Upload all videos first
    st.info("⏫ Uploading all videos...")
    
    job_ids = []
    upload_progress = st.progress(0)
    
    for i, video_file in enumerate(video_files, 1):
        with st.spinner(f"Uploading {video_file.name}..."):
            job_id = upload_video(video_file)
            if job_id:
                job_ids.append({
                    'job_id': job_id,
                    'filename': video_file.name
                })
        
        upload_progress.progress(i / len(video_files))
    
    st.success(f"✅ {len(job_ids)} videos uploaded!")
    
    # Track all jobs
    st.subheader("🔄 Processing Status")
    
    # Create placeholder for status table
    status_placeholder = st.empty()
    
    results_list = []
    completed = 0
    
    while completed < len(job_ids):
        status_data = []
        
        for job_info in job_ids:
            job_id = job_info['job_id']
            filename = job_info['filename']
            
            # Check if already completed
            if any(r['job_id'] == job_id for r in results_list):
                status_data.append({
                    'Video': filename,
                    'Status': '✅ Completed',
                    'Progress': '100%'
                })
                continue
            
            # Get status
            job_status = get_job_status(job_id)
            
            if job_status:
                status = job_status['status']
                progress = job_status['progress']
                
                if status == 'completed':
                    # Get results
                    results = get_results(job_id)
                    if results:
                        results_list.append({
                            'filename': filename,
                            'job_id': job_id,
                            'prediction': results['prediction'],
                            'confidence': results['confidence'],
                            'results': results
                        })
                        completed += 1
                    
                    status_data.append({
                        'Video': filename,
                        'Status': '✅ Completed',
                        'Progress': '100%'
                    })
                
                elif status == 'failed':
                    status_data.append({
                        'Video': filename,
                        'Status': '❌ Failed',
                        'Progress': f'{progress}%'
                    })
                    completed += 1
                
                else:
                    status_icon = '⏳' if status == 'processing' else '⏸️'
                    status_data.append({
                        'Video': filename,
                        'Status': f'{status_icon} {status.title()}',
                        'Progress': f'{progress}%'
                    })
            else:
                status_data.append({
                    'Video': filename,
                    'Status': '❓ Unknown',
                    'Progress': 'N/A'
                })
        
        # Update status table
        df_status = pd.DataFrame(status_data)
        status_placeholder.dataframe(df_status, use_container_width=True)
        
        time.sleep(3)
    
    st.success("✅ All videos processed!")
    
    # Display batch summary
    display_batch_summary(results_list)


def display_batch_summary(results_list):
    """Display summary of batch processing results"""
    
    if not results_list:
        st.warning("No results to display")
        return
    
    st.markdown("---")
    st.header("📊 Batch Analysis Summary")
    
    # Overall metrics
    col1, col2, col3, col4 = st.columns(4)
    
    total_videos = len(results_list)
    fake_videos = len([r for r in results_list if r['prediction'] == 'FAKE'])
    real_videos = len([r for r in results_list if r['prediction'] == 'REAL'])
    avg_confidence = sum(r['confidence'] for r in results_list) / total_videos
    
    with col1:
        st.metric("Total Videos", total_videos)
    
    with col2:
        st.metric("Deepfakes Found", fake_videos, delta=f"{fake_videos/total_videos*100:.0f}%", delta_color="inverse")
    
    with col3:
        st.metric("Authentic Videos", real_videos, delta=f"{real_videos/total_videos*100:.0f}%")
    
    with col4:
        st.metric("Avg Confidence", f"{avg_confidence*100:.1f}%")
    
    st.markdown("---")
    
    # Results table
    st.subheader("📋 Detailed Results")
    
    table_data = []
    for r in results_list:
        table_data.append({
            'Filename': r['filename'],
            'Verdict': '🔴 FAKE' if r['prediction'] == 'FAKE' else '🟢 REAL',
            'Confidence': f"{r['confidence']*100:.1f}%",
            'Fake Faces': r['results']['fake_face_count'],
            'Real Faces': r['results']['real_face_count'],
            'Fake %': f"{r['results']['fake_face_percentage']:.1f}%",
            'Job ID': r['job_id'][:8] + "..."
        })
    
    df_results = pd.DataFrame(table_data)
    st.dataframe(df_results, use_container_width=True)
    
    st.markdown("---")
    
    # View individual results
    st.subheader("🔍 View Individual Results")
    
    selected_video = st.selectbox(
        "Select a video to view detailed results",
        options=[r['filename'] for r in results_list]
    )
    
    if st.button("View Details"):
        selected_result = next(r for r in results_list if r['filename'] == selected_video)
        display_results(selected_result['job_id'])
    
    st.markdown("---")
    
    # Export options
    col1, col2 = st.columns(2)
    
    with col1:
        # Download summary as CSV
        csv_data = df_results.to_csv(index=False)
        st.download_button(
            label="📥 Download Summary (CSV)",
            data=csv_data,
            file_name=f"batch_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv",
            use_container_width=True
        )
    
    with col2:
        # Download all results as JSON
        json_data = json.dumps([r['results'] for r in results_list], indent=2)
        st.download_button(
            label="📥 Download All Results (JSON)",
            data=json_data,
            file_name=f"batch_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json",
            use_container_width=True
        )


def display_results(job_id):
    """Display analysis results"""
    
    # Get results
    results = get_results(job_id)
    
    if not results:
        st.error("Failed to retrieve results")
        return
    
    st.markdown("---")
    st.header("📊 Analysis Results")
    
    # Verdict
    display_verdict(results['prediction'], results['confidence'])
    
    st.markdown("---")
    
    # Statistics
    st.subheader("📈 Statistics")
    display_statistics(results)
    
    st.markdown("---")
    
    # Heatmaps
    if results['heatmaps']:
        display_heatmaps(job_id, results['heatmaps'])
    
    st.markdown("---")
    
    # Actions
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("📄 Download PDF Report", use_container_width=True):
            st.info("PDF generation coming soon!")
    
    with col2:
        if st.button("🔄 Analyze Another Video", use_container_width=True):
            st.rerun()
    
    with col3:
        # Download JSON
        json_data = json.dumps(results, indent=2)
        st.download_button(
            label="📥 Download JSON",
            data=json_data,
            file_name=f"analysis_{job_id[:8]}.json",
            mime="application/json",
            use_container_width=True
        )


def show_history_page():
    """Show analysis history"""
    
    st.header("📜 Analysis History")
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/jobs?limit=50", headers=HEADERS)
        
        if response.status_code == 200:
            jobs = response.json()['jobs']
            
            if not jobs:
                st.info("No analysis history yet")
                return
            
            # Convert to DataFrame
            df = pd.DataFrame(jobs)
            df['created_at'] = pd.to_datetime(df['created_at'])
            df = df.sort_values('created_at', ascending=False)
            
            # Filter options
            col1, col2 = st.columns(2)
            
            with col1:
                status_filter = st.multiselect(
                    "Filter by Status",
                    options=['queued', 'processing', 'completed', 'failed'],
                    default=['completed']
                )
            
            with col2:
                limit = st.slider("Number of records", 5, 50, 20)
            
            # Filter DataFrame
            if status_filter:
                df_filtered = df[df['status'].isin(status_filter)].head(limit)
            else:
                df_filtered = df.head(limit)
            
            # Display table
            st.dataframe(
                df_filtered[['job_id', 'video_filename', 'status', 'progress', 'created_at']],
                use_container_width=True
            )
            
            # View details
            st.subheader("View Job Details")
            selected_job = st.selectbox(
                "Select a job to view details",
                options=df_filtered['job_id'].tolist(),
                format_func=lambda x: f"{x[:8]}... - {df_filtered[df_filtered['job_id']==x]['video_filename'].iloc[0]}"
            )
            
            if st.button("View Results"):
                if df_filtered[df_filtered['job_id']==selected_job]['status'].iloc[0] == 'completed':
                    display_results(selected_job)
                else:
                    st.warning("Job not completed yet")
        
        else:
            st.error("Failed to load history")
    
    except Exception as e:
        st.error(f"Error loading history: {str(e)}")


def show_statistics_page():
    """Show system statistics"""
    
    st.header("📊 System Statistics")
    
    try:
        response = requests.get(f"{API_BASE_URL}/api/jobs?limit=100", headers=HEADERS)
        
        if response.status_code == 200:
            jobs = response.json()['jobs']
            
            if not jobs:
                st.info("No data available yet")
                return
            
            # Overall metrics
            st.subheader("📈 Overall Metrics")
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("Total Analyses", len(jobs))
            
            with col2:
                completed = len([j for j in jobs if j['status'] == 'completed'])
                st.metric("Completed", completed)
            
            with col3:
                failed = len([j for j in jobs if j['status'] == 'failed'])
                st.metric("Failed", failed)
            
            with col4:
                processing = len([j for j in jobs if j['status'] == 'processing'])
                st.metric("In Progress", processing)
            
            st.markdown("---")
            
            # Get results for completed jobs
            completed_jobs = [j for j in jobs if j['status'] == 'completed']
            
            if completed_jobs:
                st.subheader("🎯 Detection Results")
                
                results_data = []
                for job in completed_jobs[:50]:  # Limit to recent 50
                    result = get_results(job['job_id'])
                    if result:
                        results_data.append(result)
                
                if results_data:
                    fake_count = len([r for r in results_data if r['prediction'] == 'FAKE'])
                    real_count = len([r for r in results_data if r['prediction'] == 'REAL'])
                    
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        st.metric("Deepfakes Detected", fake_count)
                    
                    with col2:
                        st.metric("Authentic Videos", real_count)
                    
                    with col3:
                        avg_conf = sum(r['confidence'] for r in results_data) / len(results_data)
                        st.metric("Avg Confidence", f"{avg_conf*100:.1f}%")
                    
                    # Chart
                    st.subheader("📊 Detection Distribution")
                    chart_data = pd.DataFrame({
                        'Type': ['Deepfake', 'Authentic'],
                        'Count': [fake_count, real_count]
                    })
                    st.bar_chart(chart_data.set_index('Type'))
        
        else:
            st.error("Failed to load statistics")
    
    except Exception as e:
        st.error(f"Error loading statistics: {str(e)}")


if __name__ == "__main__":
    main()