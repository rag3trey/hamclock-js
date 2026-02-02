"""
User settings and preferences management.
Stores user preferences like DE location, QRZ API key, UI theme, etc.
"""

import json
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import BaseModel


class UserSettings(BaseModel):
    """User settings schema."""
    callsign: Optional[str] = None  # User's amateur radio callsign
    de_latitude: Optional[float] = None
    de_longitude: Optional[float] = None
    de_location_name: Optional[str] = None
    theme: str = "dark"  # dark or light
    time_format: str = "24h"  # 24h or 12h
    qrz_api_key: Optional[str] = None
    qrz_username: Optional[str] = None
    callsign_lookup_service: str = "radioid"  # radioid or qrz
    elevation_angle_default: int = 10  # degrees
    satellite_lookahead_hours: int = 24
    units: str = "metric"  # metric or imperial
    temperature_unit: str = "celsius"  # celsius, fahrenheit, or kelvin

    class Config:
        json_schema_extra = {
            "example": {
                "callsign": "W5XYZ",
                "de_latitude": 37.7749,
                "de_longitude": -122.4194,
                "de_location_name": "San Francisco",
                "theme": "dark",
                "time_format": "24h",
                "qrz_api_key": None,
                "qrz_username": None,
                "callsign_lookup_service": "radioid",
                "elevation_angle_default": 10,
                "satellite_lookahead_hours": 24,
                "units": "metric",
            }
        }


class SettingsService:
    """Singleton service for managing user settings."""

    _instance: Optional["SettingsService"] = None
    _settings_file: Path = Path.home() / ".hamclock" / "settings.json"

    def __new__(cls) -> "SettingsService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        # Ensure directory exists
        self._settings_file.parent.mkdir(parents=True, exist_ok=True)
        self.settings = self._load_settings()

    def _load_settings(self) -> UserSettings:
        """Load settings from file or create defaults."""
        if self._settings_file.exists():
            try:
                with open(self._settings_file, "r") as f:
                    data = json.load(f)
                    return UserSettings(**data)
            except Exception as e:
                print(f"Error loading settings: {e}, using defaults")
                return UserSettings()
        return UserSettings()

    def _save_settings(self) -> None:
        """Save settings to file."""
        try:
            with open(self._settings_file, "w") as f:
                json.dump(self.settings.dict(), f, indent=2)
        except Exception as e:
            print(f"Error saving settings: {e}")

    def get_settings(self) -> UserSettings:
        """Get current settings."""
        return self.settings

    def update_settings(self, **kwargs) -> UserSettings:
        """Update settings and persist to file."""
        # Only update fields that are provided and valid
        update_data = {}
        for key, value in kwargs.items():
            if hasattr(self.settings, key) and value is not None:
                update_data[key] = value

        if update_data:
            # Merge with existing settings
            current_data = self.settings.dict()
            current_data.update(update_data)
            self.settings = UserSettings(**current_data)
            self._save_settings()

        return self.settings

    def get_de_location(self) -> Optional[Dict[str, Any]]:
        """Get DE location as dict."""
        if self.settings.de_latitude is not None and self.settings.de_longitude is not None:
            return {
                "latitude": self.settings.de_latitude,
                "longitude": self.settings.de_longitude,
                "name": self.settings.de_location_name or "My Location",
            }
        return None

    def set_de_location(self, latitude: float, longitude: float, name: str = None) -> None:
        """Set DE location."""
        self.update_settings(
            de_latitude=latitude,
            de_longitude=longitude,
            de_location_name=name or "My Location",
        )

    def set_qrz_credentials(self, username: str, api_key: str) -> None:
        """Set QRZ API credentials."""
        self.update_settings(qrz_username=username, qrz_api_key=api_key)

    def get_qrz_credentials(self) -> Optional[Dict[str, str]]:
        """Get QRZ credentials if configured."""
        if self.settings.qrz_username and self.settings.qrz_api_key:
            return {
                "username": self.settings.qrz_username,
                "api_key": self.settings.qrz_api_key,
            }
        return None

    def set_theme(self, theme: str) -> None:
        """Set UI theme."""
        if theme in ("dark", "light"):
            self.update_settings(theme=theme)
        else:
            raise ValueError(f"Invalid theme: {theme}")

    def set_time_format(self, format: str) -> None:
        """Set time format."""
        if format in ("24h", "12h"):
            self.update_settings(time_format=format)
        else:
            raise ValueError(f"Invalid time format: {format}")

    def set_units(self, units: str) -> None:
        """Set units (metric or imperial)."""
        if units in ("metric", "imperial"):
            self.update_settings(units=units)
        else:
            raise ValueError(f"Invalid units: {units}")

    def set_temperature_unit(self, temperature_unit: str) -> None:
        """Set temperature unit (celsius, fahrenheit, or kelvin)."""
        if temperature_unit in ("celsius", "fahrenheit", "kelvin"):
            self.update_settings(temperature_unit=temperature_unit)
        else:
            raise ValueError(f"Invalid temperature unit: {temperature_unit}")

    def reset_to_defaults(self) -> UserSettings:
        """Reset all settings to defaults."""
        self.settings = UserSettings()
        self._save_settings()
        return self.settings


# Global singleton instance
_settings_service = SettingsService()

def get_settings_service() -> SettingsService:
    """Get the global settings service instance."""
    return _settings_service