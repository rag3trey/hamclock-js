#!/bin/bash
# Script to run HamClock backend natively with Anaconda

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "❌ Conda is not installed or not in PATH"
    echo "Please install Anaconda or Miniconda first"
    exit 1
fi

# Check if hamclock environment exists
if ! conda env list | grep -q "^hamclock "; then
    echo "📦 Creating hamclock conda environment..."
    conda env create -f environment.yml
fi

# Activate environment and run backend
echo "🚀 Starting HamClock backend..."
cd backend
eval "$(conda shell.bash hook)"
conda activate hamclock
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
