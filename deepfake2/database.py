"""
Database module for API job tracking
Uses SQLite for simplicity (can be upgraded to PostgreSQL)

Author: Gbotemi
Date: November 2025
"""

import sqlite3
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, List
import json
from pathlib import Path


class JobStatus(Enum):
    """Job status enumeration"""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Database:
    """Database handler for job tracking"""
    
    def __init__(self, db_path: str = "api_database.db"):
        """Initialize database connection and create tables"""
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._create_tables()
    
    def _create_tables(self):
        """Create database tables if they don't exist"""
        cursor = self.conn.cursor()
        
        # Jobs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                video_filename TEXT NOT NULL,
                video_path TEXT NOT NULL,
                output_dir TEXT NOT NULL,
                status TEXT NOT NULL,
                progress INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                error_message TEXT
            )
        """)
        
        # Results table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS results (
                job_id TEXT PRIMARY KEY,
                prediction TEXT NOT NULL,
                confidence REAL NOT NULL,
                fake_face_count INTEGER NOT NULL,
                real_face_count INTEGER NOT NULL,
                fake_face_percentage REAL NOT NULL,
                processing_time REAL NOT NULL,
                heatmaps TEXT,
                json_path TEXT,
                FOREIGN KEY (job_id) REFERENCES jobs(job_id)
            )
        """)
        
        # Request logs table (for audit trail)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS request_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT,
                endpoint TEXT NOT NULL,
                method TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT
            )
        """)
        
        self.conn.commit()
    
    def create_job(
        self,
        job_id: str,
        video_filename: str,
        video_path: str,
        output_dir: str
    ):
        """Create a new job entry"""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            INSERT INTO jobs (
                job_id, video_filename, video_path, output_dir,
                status, progress, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            job_id,
            video_filename,
            video_path,
            output_dir,
            JobStatus.QUEUED.value,
            0,
            datetime.now().isoformat()
        ))
        
        self.conn.commit()
    
    def get_job(self, job_id: str) -> Optional[Dict]:
        """Get job by ID"""
        cursor = self.conn.cursor()
        
        cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()
        
        if row:
            return dict(row)
        return None
    
    def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        progress: Optional[int] = None,
        error_message: Optional[str] = None
    ):
        """Update job status and progress"""
        cursor = self.conn.cursor()
        
        updates = ["status = ?"]
        params = [status.value]
        
        if progress is not None:
            updates.append("progress = ?")
            params.append(progress)
        
        if status == JobStatus.COMPLETED:
            updates.append("completed_at = ?")
            params.append(datetime.now().isoformat())
        
        if error_message:
            updates.append("error_message = ?")
            params.append(error_message)
        
        params.append(job_id)
        
        query = f"UPDATE jobs SET {', '.join(updates)} WHERE job_id = ?"
        cursor.execute(query, params)
        
        self.conn.commit()
    
    def store_results(self, job_id: str, results_data: Dict):
        """Store analysis results"""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            INSERT INTO results (
                job_id, prediction, confidence,
                fake_face_count, real_face_count, fake_face_percentage,
                processing_time, heatmaps, json_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            job_id,
            results_data['prediction'],
            results_data['confidence'],
            results_data['fake_face_count'],
            results_data['real_face_count'],
            results_data['fake_face_percentage'],
            results_data['processing_time'],
            json.dumps(results_data['heatmaps']),
            results_data['json_path']
        ))
        
        self.conn.commit()
    
    def get_results(self, job_id: str) -> Optional[Dict]:
        """Get results by job ID"""
        cursor = self.conn.cursor()
        
        cursor.execute("SELECT * FROM results WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()
        
        if row:
            return dict(row)
        return None
    
    def list_jobs(self, limit: int = 50, status: Optional[str] = None) -> List[Dict]:
        """List jobs with optional status filter"""
        cursor = self.conn.cursor()
        
        if status:
            cursor.execute(
                "SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC LIMIT ?",
                (status, limit)
            )
        else:
            cursor.execute(
                "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?",
                (limit,)
            )
        
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    
    def delete_job(self, job_id: str):
        """Delete job and associated results"""
        cursor = self.conn.cursor()
        
        cursor.execute("DELETE FROM results WHERE job_id = ?", (job_id,))
        cursor.execute("DELETE FROM jobs WHERE job_id = ?", (job_id,))
        
        self.conn.commit()
    
    def log_request(
        self,
        endpoint: str,
        method: str,
        job_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log API request for audit trail"""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            INSERT INTO request_logs (
                job_id, endpoint, method, timestamp, ip_address, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            job_id,
            endpoint,
            method,
            datetime.now().isoformat(),
            ip_address,
            user_agent
        ))
        
        self.conn.commit()
    
    def get_statistics(self) -> Dict:
        """Get overall statistics"""
        cursor = self.conn.cursor()
        
        stats = {}
        
        # Total jobs
        cursor.execute("SELECT COUNT(*) as count FROM jobs")
        stats['total_jobs'] = cursor.fetchone()['count']
        
        # Jobs by status
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM jobs
            GROUP BY status
        """)
        stats['by_status'] = {row['status']: row['count'] for row in cursor.fetchall()}
        
        # Results summary
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN prediction = 'FAKE' THEN 1 ELSE 0 END) as fake_count,
                SUM(CASE WHEN prediction = 'REAL' THEN 1 ELSE 0 END) as real_count,
                AVG(confidence) as avg_confidence,
                AVG(processing_time) as avg_processing_time
            FROM results
        """)
        row = cursor.fetchone()
        stats['results'] = dict(row) if row else {}
        
        return stats
    
    def cleanup_old_jobs(self, days: int = 7):
        """Clean up jobs older than specified days"""
        cursor = self.conn.cursor()
        
        cutoff_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        cutoff_date = cutoff_date.replace(day=cutoff_date.day - days)
        
        cursor.execute("""
            DELETE FROM results 
            WHERE job_id IN (
                SELECT job_id FROM jobs 
                WHERE created_at < ?
            )
        """, (cutoff_date.isoformat(),))
        
        cursor.execute(
            "DELETE FROM jobs WHERE created_at < ?",
            (cutoff_date.isoformat(),)
        )
        
        deleted_count = cursor.rowcount
        self.conn.commit()
        
        return deleted_count
    
    def close(self):
        """Close database connection"""
        self.conn.close()
