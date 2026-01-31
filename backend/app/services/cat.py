"""
CAT (Computer Aided Transceiver) Control Service
Supports Kenwood, Yaesu, and Icom radios via serial connection
"""

import threading
import time
from typing import Optional, Dict, Any

# Lazy import serial - only load when actually connecting
serial = None


def _ensure_serial():
    """Lazy import of serial module"""
    global serial
    if serial is None:
        try:
            import serial as serial_module
            serial = serial_module
        except ImportError:
            raise ImportError(
                "pyserial is not installed. Install it with: pip install pyserial"
            )


class CATService:
    """Service for controlling radios via CAT interface"""
    
    def __init__(self):
        self.serial_conn: Optional[serial.Serial] = None
        self.connected = False
        self.radio_model = None
        self.frequency = 0
        self.mode = "USB"
        self.power = 100
        self.port = None
        self.baudrate = 9600
        self.lock = threading.Lock()
        
        # Radio-specific command prefixes
        self.radios = {
            "kenwood": {
                "freq_get": b"FR\r",
                "freq_set": b"FT {freq}\r",
                "mode_get": b"MD\r",
                "mode_set": b"MD{mode}\r",
                "power_get": b"PC\r",
                "power_set": b"PC{power}\r",
            },
            "yaesu": {
                "freq_get": b"FA\r",
                "freq_set": b"FA{freq}\r",
                "mode_get": b"MD\r",
                "mode_set": b"MD{mode}\r",
                "power_get": b"PC\r",
                "power_set": b"PC{power:03d}\r",
            },
            "icom": {
                "freq_get": b"\xfe\xfe\x94\xe0\x03\xfd",
                "freq_set": b"\xfe\xfe\x94\xe0\x05{freq}\xfd",
                "mode_get": b"\xfe\xfe\x94\xe0\x04\xfd",
                "mode_set": b"\xfe\xfe\x94\xe0\x06{mode}\xfd",
            }
        }
        
        # Mode mappings (Kenwood standard)
        self.modes = {
            1: "LSB",
            2: "USB",
            3: "CW",
            4: "FM",
            5: "AM",
            6: "FSK",
            7: "CWR",
            8: "FSK",
        }

    def connect(self, port: str, radio_model: str = "kenwood", baudrate: int = 9600) -> bool:
        """Connect to radio via serial port"""
        _ensure_serial()  # Ensure serial module is loaded
        
        try:
            print(f"CAT: Attempting to connect to {radio_model} on {port} at {baudrate} baud")
            
            self.serial_conn = serial.Serial(
                port=port,
                baudrate=baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=0.5,  # Shorter timeout to prevent long waits
                write_timeout=0.5
            )
            
            self.port = port
            self.radio_model = radio_model.lower()
            self.baudrate = baudrate
            self.connected = True
            
            # Clear any existing data in buffer
            self.serial_conn.reset_input_buffer()
            self.serial_conn.reset_output_buffer()
            
            # Test connection with frequency query
            freq = self._get_frequency()
            print(f"CAT: Connected to {radio_model}. Current frequency: {freq} Hz")
            
            return True
            
        except serial.SerialException as e:
            print(f"CAT: Serial connection failed: {e}")
            self.connected = False
            return False
        except Exception as e:
            print(f"CAT: Unexpected error during connect: {e}")
            self.connected = False
            return False

    def disconnect(self) -> bool:
        """Disconnect from radio"""
        try:
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.close()
            self.connected = False
            print("CAT: Disconnected from radio")
            return True
        except Exception as e:
            print(f"CAT: Error disconnecting: {e}")
            return False

    def _send_command(self, command: bytes, expect_response: bool = True) -> Optional[bytes]:
        """Send raw command to radio and optionally get response"""
        if not self.connected or not self.serial_conn:
            return None
            
        try:
            with self.lock:
                # Clear input buffer before sending
                self.serial_conn.reset_input_buffer()
                self.serial_conn.write(command)
                
                if expect_response:
                    time.sleep(0.2)  # Give radio more time to respond
                    response = self.serial_conn.read(100)
                    return response if response else None
                else:
                    # For set commands, give radio time to process
                    time.sleep(0.05)
                    
            return None
            
        except Exception as e:
            print(f"CAT: Error sending command: {e}")
            return None

    def _get_frequency(self) -> int:
        """Get current frequency from radio (Hz)"""
        if not self.connected:
            return 0
            
        try:
            # Get command based on radio model
            if self.radio_model not in self.radios:
                return self.frequency
                
            command = self.radios[self.radio_model]["freq_get"]
            response = self._send_command(command)
            
            if response:
                freq_str = response.decode().strip()
                
                # Parse based on radio model
                if self.radio_model == "yaesu":
                    if freq_str.startswith('FA'):
                        freq_hz = int(freq_str[2:]) * 10  # Convert to Hz
                        self.frequency = freq_hz
                        return freq_hz
                elif self.radio_model == "kenwood":
                    if freq_str.startswith('FR'):
                        freq_hz = int(freq_str[2:])
                        self.frequency = freq_hz
                        return freq_hz
                    
        except Exception as e:
            print(f"CAT: Error getting frequency: {e}")
            
        return self.frequency

    def _set_frequency(self, frequency_hz: int) -> bool:
        """Set frequency on radio (Hz)"""
        if not self.connected:
            return False
            
        try:
            if self.radio_model not in self.radios:
                return False
            
            # Format command based on radio model
            if self.radio_model == "yaesu":
                freq_val = frequency_hz // 10
                command = f"FA{freq_val:011d}\r".encode()
            elif self.radio_model == "kenwood":
                command = f"FT {frequency_hz:011d}\r".encode()
            else:
                return False
            
            # Send command (set commands typically don't return a response)
            result = self._send_command(command, expect_response=False)
            if result is not None or True:  # Command was sent
                self.frequency = frequency_hz
                print(f"CAT: Set frequency to {frequency_hz} Hz")
                return True
                
        except Exception as e:
            print(f"CAT: Error setting frequency: {e}")
            
        return False

    def _get_mode(self) -> str:
        """Get current mode from radio"""
        if not self.connected:
            return "UNKNOWN"
            
        try:
            if self.radio_model not in self.radios:
                return "UNKNOWN"
                
            command = self.radios[self.radio_model]["mode_get"]
            response = self._send_command(command)
            
            if response:
                mode_str = response.decode().strip()
                if mode_str.startswith('MD'):
                    mode_num = int(mode_str[2])
                    self.mode = self.modes.get(mode_num, "UNKNOWN")
                    return self.mode
                    
        except Exception as e:
            print(f"CAT: Error getting mode: {e}")
            
        return self.mode

    def _set_mode(self, mode: str) -> bool:
        """Set mode on radio"""
        if not self.connected:
            return False
            
        try:
            if self.radio_model not in self.radios:
                return False
            
            # Find mode number
            mode_upper = mode.upper()
            mode_num = None
            for num, name in self.modes.items():
                if name == mode_upper:
                    mode_num = num
                    break
                    
            if mode_num is None:
                print(f"CAT: Unknown mode: {mode}")
                return False
            
            # Format command based on radio model
            if self.radio_model == "yaesu" or self.radio_model == "kenwood":
                command = f"MD{mode_num}\r".encode()
            else:
                return False
            
            # Send command (set commands typically don't return a response)
            result = self._send_command(command, expect_response=False)
            if result is not None or True:  # Command was sent
                self.mode = mode_upper
                print(f"CAT: Set mode to {mode}")
                return True
                
        except Exception as e:
            print(f"CAT: Error setting mode: {e}")
            
        return False

    def _get_power(self) -> int:
        """Get current power level (0-100 or watts)"""
        if not self.connected:
            return 0
            
        try:
            if self.radio_model not in self.radios:
                return 0
                
            command = self.radios[self.radio_model]["power_get"]
            response = self._send_command(command)
            
            if response:
                power_str = response.decode().strip()
                if power_str.startswith('PC'):
                    power_val = int(power_str[2:])
                    self.power = power_val
                    return power_val
                    
        except Exception as e:
            print(f"CAT: Error getting power: {e}")
            
        return self.power

    def _set_power(self, power: int) -> bool:
        """Set power level (0-100 or watts depending on radio)"""
        if not self.connected:
            return False
            
        try:
            if self.radio_model not in self.radios:
                return False
            
            # Clamp power to valid range
            power = max(0, min(100, power))
            
            # Format command based on radio model
            if self.radio_model == "yaesu":
                command = f"PC{power:03d}\r".encode()
            elif self.radio_model == "kenwood":
                command = f"PC{power:03d}\r".encode()
            else:
                return False
            
            # Send command (set commands typically don't return a response)
            self._send_command(command, expect_response=False)
            self.power = power
            print(f"CAT: Set power to {power}")
            return True
                
        except Exception as e:
            print(f"CAT: Error setting power: {e}")
            
        return False

    def get_status(self) -> Dict[str, Any]:
        """Get current radio status"""
        return {
            "connected": self.connected,
            "radio_model": self.radio_model,
            "port": self.port,
            "frequency_hz": self._get_frequency(),
            "frequency_mhz": self._get_frequency() / 1_000_000,
            "mode": self._get_mode(),
            "power": self._get_power(),
        }

    def set_frequency(self, frequency_hz: int) -> bool:
        """Public method to set frequency"""
        return self._set_frequency(frequency_hz)

    def set_mode(self, mode: str) -> bool:
        """Public method to set mode"""
        return self._set_mode(mode)

    def set_power(self, power: int) -> bool:
        """Public method to set power"""
        return self._set_power(power)

    def get_frequency(self) -> int:
        """Public method to get frequency"""
        return self._get_frequency()

    def get_mode(self) -> str:
        """Public method to get mode"""
        return self._get_mode()

    def get_power(self) -> int:
        """Public method to get power"""
        return self._get_power()


# Global CAT service instance
cat_service = CATService()
