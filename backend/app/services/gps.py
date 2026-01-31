"""
GPS Service - Real-time location tracking via GPSD
"""
import socket
import json
import time
from typing import Dict, Optional, Any
from datetime import datetime, timezone
import asyncio


class GPSService:
    """Service for reading GPS data from GPSD daemon"""
    
    def __init__(self, host: str = 'localhost', port: int = 2947, timeout: int = 5):
        """
        Initialize GPS service
        
        Args:
            host: GPSD host (default localhost)
            port: GPSD port (default 2947)
            timeout: Connection timeout in seconds
        """
        self.host = host
        self.port = port
        self.timeout = timeout
        self.socket = None
        self.last_fix = None
        self.connected = False
        self.enabled = True
    
    def connect(self) -> bool:
        """Connect to GPSD daemon"""
        try:
            print(f"GPS: Attempting to connect to {self.host}:{self.port}...")
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(self.timeout)
            self.socket.connect((self.host, self.port))
            print(f"GPS: Socket connected")
            
            # Send WATCH command to enable tracking
            watch_cmd = {"class": "WATCH", "enable": True, "json": True}
            cmd_str = json.dumps(watch_cmd) + '\n'
            print(f"GPS: Sending WATCH command: {cmd_str.strip()}")
            self.socket.sendall(cmd_str.encode())
            
            self.connected = True
            print(f"GPS: Successfully connected to GPSD")
            return True
        except socket.timeout as e:
            print(f"GPS: Connection timeout: {e}")
            self.connected = False
            self.socket = None
            return False
        except ConnectionRefusedError as e:
            print(f"GPS: Connection refused - GPSD not running on {self.host}:{self.port}")
            self.connected = False
            self.socket = None
            return False
        except OSError as e:
            print(f"GPS: OS error: {e}")
            self.connected = False
            self.socket = None
            return False
        except Exception as e:
            print(f"GPS: Unexpected error: {e}")
            self.connected = False
            self.socket = None
            return False
    
    def disconnect(self):
        """Disconnect from GPSD"""
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
            self.socket = None
            self.connected = False
    
    def read_fix(self) -> Optional[Dict[str, Any]]:
        """Read next GPS fix from GPSD"""
        if not self.connected:
            if not self.connect():
                return None
        
        try:
            data = self.socket.recv(4096).decode('utf-8')
            if not data:
                self.connected = False
                return None
            
            for line in data.strip().split('\n'):
                if not line:
                    continue
                try:
                    message = json.loads(line)
                    
                    # We're interested in TPV (Time Position Velocity) messages
                    if message.get('class') == 'TPV':
                        fix = {
                            'latitude': message.get('lat'),
                            'longitude': message.get('lon'),
                            'altitude': message.get('alt', 0),
                            'accuracy': message.get('epy', message.get('eps', None)),  # Estimated position accuracy
                            'speed': message.get('speed', 0),
                            'track': message.get('track', 0),
                            'climb': message.get('climb', 0),
                            'timestamp': message.get('time'),
                            'satellites': message.get('satellites', 0),
                            'mode': message.get('mode', 0),  # 0=no fix, 2=2D, 3=3D
                        }
                        
                        # Only return if we have a valid fix
                        if fix['latitude'] is not None and fix['longitude'] is not None:
                            self.last_fix = fix
                            return fix
                    
                    # SKY messages give satellite info
                    elif message.get('class') == 'SKY':
                        if self.last_fix:
                            self.last_fix['satellites'] = len(message.get('satellites', []))
                
                except json.JSONDecodeError:
                    continue
            
            return self.last_fix
        
        except socket.timeout:
            return self.last_fix
        except Exception as e:
            print(f"GPS read error: {e}")
            self.connected = False
            self.socket = None
            return self.last_fix
    
    def get_current_position(self) -> Optional[Dict[str, Any]]:
        """Get current position with multiple read attempts"""
        for _ in range(3):
            fix = self.read_fix()
            if fix and fix.get('latitude') and fix.get('longitude'):
                return fix
        
        return self.last_fix
    
    def get_status(self) -> Dict[str, Any]:
        """Get GPS connection status"""
        return {
            'connected': self.connected,
            'enabled': self.enabled,
            'host': self.host,
            'port': self.port,
            'last_fix': self.last_fix,
            'has_position': bool(self.last_fix and self.last_fix.get('latitude')),
            'satellites': self.last_fix.get('satellites', 0) if self.last_fix else 0,
            'accuracy_m': self.last_fix.get('accuracy') if self.last_fix else None,
        }


# Global GPS service instance
gps_service = GPSService()
