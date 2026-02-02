#!/usr/bin/env python3
"""
Enhanced Wireshark Trigger for Smart Fault Analyser
Captures packets and performs comprehensive analysis
"""

import subprocess
import json
import os
import argparse
import sys
from datetime import datetime
from pathlib import Path

def run_tshark_capture(interface, duration, output_file):
    """Run packet capture using tshark"""
    print(f"📡 Starting packet capture on interface '{interface}' for {duration}s...")
    print(f"📂 Output file: {output_file}")
    
    try:
        cmd = [
            "/Applications/Wireshark.app/Contents/MacOS/tshark",
            "-i", interface,
            "-a", f"duration:{duration}",
            "-w", output_file
        ]
        
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        
        if process.returncode not in [0, 1]:  # Tshark often returns 1 on normal exit
            print(f"❌ Tshark error: {stderr.decode()}", file=sys.stderr)
            return False
            
        print("✅ Capture completed successfully.")
        return True
    except FileNotFoundError:
        print("❌ Error: tshark not found. Please install Wireshark.", file=sys.stderr)
        return False
    except Exception as e:
        print(f"❌ Error during capture: {str(e)}", file=sys.stderr)
        return False

def run_advanced_analysis(pcap_file, analyzer_script):
    """Run advanced packet analysis"""
    print("🔬 Running advanced packet analysis...")
    
    try:
        cmd = ["python3", analyzer_script, pcap_file, "--pretty"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode != 0:
            print(f"⚠️  Analysis completed with warnings", file=sys.stderr)
            print(result.stderr, file=sys.stderr)
        
        print(result.stdout)
        return True
    except subprocess.TimeoutExpired:
        print("⚠️  Analysis timed out after 120 seconds", file=sys.stderr)
        return False
    except Exception as e:
        print(f"❌ Error during analysis: {str(e)}", file=sys.stderr)
        return False

def store_analysis_in_db(analysis_file, complaint_id, db_config):
    """Store analysis results in database (placeholder for future implementation)"""
    print(f"💾 Analysis results saved to: {analysis_file}")
    print(f"   Associated with complaint ID: {complaint_id}")
    # TODO: Implement database storage via backend API
    return True

def main():
    parser = argparse.ArgumentParser(
        description="Smart Fault Analyser - Enhanced Packet Capture and Analysis"
    )
    parser.add_argument("--duration", type=int, default=15, 
                       help="Capture duration in seconds (default: 15)")
    parser.add_argument("--interface", type=str, default="en0", 
                       help="Network interface to capture on (default: en0)")
    parser.add_argument("--output_dir", type=str, default="Backend/captures", 
                       help="Directory to save captures (default: Backend/captures)")
    parser.add_argument("--complaint_id", type=str, required=True, 
                       help="Associated complaint ID")
    parser.add_argument("--skip-analysis", action="store_true",
                       help="Skip advanced analysis (capture only)")
    
    args = parser.parse_args()
    
    # Ensure output directory exists
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filenames
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pcap_file = output_dir / f"complaint_{args.complaint_id}_{timestamp}.pcap"
    
    print("\n" + "="*60)
    print("SMART FAULT ANALYSER - PACKET CAPTURE")
    print("="*60)
    print(f"Complaint ID: {args.complaint_id}")
    print(f"Interface: {args.interface}")
    print(f"Duration: {args.duration}s")
    print(f"Output: {pcap_file}")
    print("="*60 + "\n")
    
    # Run packet capture
    if not run_tshark_capture(args.interface, args.duration, str(pcap_file)):
        print("\n❌ Packet capture failed!")
        sys.exit(1)
    
    # Check if capture file exists and has content
    if not pcap_file.exists() or pcap_file.stat().st_size == 0:
        print("\n❌ Capture file is empty or doesn't exist!")
        sys.exit(1)
    
    print(f"\n✅ Capture file created: {pcap_file} ({pcap_file.stat().st_size} bytes)")
    
    # Run advanced analysis unless skipped
    if not args.skip_analysis:
        script_dir = Path(__file__).parent
        analyzer_script = script_dir / "packetAnalyzer.py"
        
        if analyzer_script.exists():
            if run_advanced_analysis(str(pcap_file), str(analyzer_script)):
                analysis_file = str(pcap_file).replace(".pcap", "_analysis.json")
                print(f"\n✅ Analysis complete! Results: {analysis_file}")
            else:
                print("\n⚠️  Advanced analysis failed, but capture is available")
        else:
            print(f"\n⚠️  Advanced analyzer not found at {analyzer_script}")
            print("   Skipping detailed analysis")
    
    print("\n" + "="*60)
    print("✅ PACKET CAPTURE COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()
