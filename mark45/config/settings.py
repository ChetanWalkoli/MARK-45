import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Settings
    app_name: str = "MARK 45 OS"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # Model Settings
    model_name: str = "llama3.2:3b"
    ollama_url: str = "http://localhost:11434"

    # Paths
    config_dir: str = os.path.dirname(os.path.abspath(__file__))
    system_prompt_path: str = os.path.join(config_dir, "system_prompt.txt")

    # Read from .env file if it exists
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
