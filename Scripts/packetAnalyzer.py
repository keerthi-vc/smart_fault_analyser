#!/usr/bin/env python3
"""
Advanced Packet Analyzer for Smart Fault Analyser
Performs deep packet inspection and generates comprehensive network insights
"""

import subprocess
import json
import os
import sys
import argparse
from datetime import datetime
from collections import defaultdict
import re

class PacketAnalyzer:
    def __init__(self, pcap_file):
        self.pcap_file = pcap_file
        self.tshark_path = "/Applications/Wireshark.app/Contents/MacOS/tshark"
        self.analysis_results = {
            "timestamp": datetime.now().isoformat(),
            "pcap_file": pcap_file,
            "total_packets": 0,
            "total_bytes": 0,
            "duration_seconds": 0,
            "protocol_distribution": {},
            "application_traffic": {},
            "tcp_analysis": {},
            "dns_analysis": {},
            "http_analysis": {},
            "network_flows": [],
            "security_anomalies": [],
            "insights": []
        }
    
    def run_tshark_command(self, args):
        """Execute tshark command and return output"""
        try:
            cmd = [self.tshark_path, "-r", self.pcap_file] + args
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.stdout
        except subprocess.TimeoutExpired:
            print(f"⚠️  Command timed out: {' '.join(args)}", file=sys.stderr)
            return ""
        except Exception as e:
            print(f"❌ Error running tshark: {e}", file=sys.stderr)
            return ""
    
    def analyze_basic_stats(self):
        """Get basic packet statistics"""
        print("📊 Analyzing basic statistics...")
        
        # Get total packet count and bytes
        output = self.run_tshark_command(["-T", "fields", "-e", "frame.number", "-e", "frame.len"])
        lines = [l for l in output.strip().split('\n') if l]
        
        self.analysis_results["total_packets"] = len(lines)
        total_bytes = sum(int(line.split('\t')[1]) for line in lines if '\t' in line)
        self.analysis_results["total_bytes"] = total_bytes
        
        # Get capture duration
        output = self.run_tshark_command(["-T", "fields", "-e", "frame.time_epoch"])
        times = [float(t) for t in output.strip().split('\n') if t]
        if len(times) > 1:
            self.analysis_results["duration_seconds"] = round(times[-1] - times[0], 2)
    
    def analyze_protocols(self):
        """Analyze protocol distribution"""
        print("🔍 Analyzing protocol distribution...")
        
        # Get protocol hierarchy
        output = self.run_tshark_command(["-q", "-z", "io,phs"])
        
        protocol_stats = {}
        for line in output.split('\n'):
            # Parse protocol hierarchy output
            match = re.search(r'(\w+)\s+frames:(\d+)\s+bytes:(\d+)', line)
            if match:
                protocol, frames, bytes_count = match.groups()
                protocol_stats[protocol] = {
                    "packet_count": int(frames),
                    "byte_count": int(bytes_count),
                    "percentage": 0
                }
        
        # Calculate percentages
        total_packets = self.analysis_results["total_packets"]
        if total_packets > 0:
            for protocol in protocol_stats:
                protocol_stats[protocol]["percentage"] = round(
                    (protocol_stats[protocol]["packet_count"] / total_packets) * 100, 2
                )
        
        self.analysis_results["protocol_distribution"] = protocol_stats
    
    def analyze_tcp(self):
        """Analyze TCP connections and issues"""
        print("🔌 Analyzing TCP connections...")
        
        # Count total TCP packets
        output = self.run_tshark_command(["-Y", "tcp", "-T", "fields", "-e", "frame.number"])
        tcp_packets = len([l for l in output.strip().split('\n') if l])
        
        # Count retransmissions
        output = self.run_tshark_command(["-Y", "tcp.analysis.retransmission", "-T", "fields", "-e", "frame.number"])
        retransmissions = len([l for l in output.strip().split('\n') if l])
        
        # Count out-of-order packets
        output = self.run_tshark_command(["-Y", "tcp.analysis.out_of_order", "-T", "fields", "-e", "frame.number"])
        out_of_order = len([l for l in output.strip().split('\n') if l])
        
        # Count duplicate ACKs
        output = self.run_tshark_command(["-Y", "tcp.analysis.duplicate_ack", "-T", "fields", "-e", "frame.number"])
        dup_acks = len([l for l in output.strip().split('\n') if l])
        
        # Count zero window
        output = self.run_tshark_command(["-Y", "tcp.analysis.zero_window", "-T", "fields", "-e", "frame.number"])
        zero_window = len([l for l in output.strip().split('\n') if l])
        
        # Get average window size
        output = self.run_tshark_command(["-Y", "tcp", "-T", "fields", "-e", "tcp.window_size_value"])
        window_sizes = [int(w) for w in output.strip().split('\n') if w.isdigit()]
        avg_window = round(sum(window_sizes) / len(window_sizes)) if window_sizes else 0
        
        retrans_rate = round((retransmissions / tcp_packets * 100), 2) if tcp_packets > 0 else 0
        
        self.analysis_results["tcp_analysis"] = {
            "total_packets": tcp_packets,
            "retransmissions": retransmissions,
            "retransmission_rate": retrans_rate,
            "out_of_order_packets": out_of_order,
            "duplicate_acks": dup_acks,
            "zero_window_count": zero_window,
            "avg_window_size": avg_window
        }
        
        # Generate TCP insights
        if retrans_rate > 5:
            self.analysis_results["insights"].append({
                "type": "tcp_issue",
                "severity": "high" if retrans_rate > 10 else "medium",
                "title": "High TCP Retransmission Rate",
                "description": f"TCP retransmission rate is {retrans_rate}%, indicating network congestion or packet loss.",
                "confidence": 85
            })
    
    def analyze_dns(self):
        """Analyze DNS queries and responses"""
        print("🌐 Analyzing DNS traffic...")
        
        # Count DNS queries
        output = self.run_tshark_command(["-Y", "dns.flags.response == 0", "-T", "fields", "-e", "frame.number"])
        total_queries = len([l for l in output.strip().split('\n') if l])
        
        # Count DNS responses
        output = self.run_tshark_command(["-Y", "dns.flags.response == 1", "-T", "fields", "-e", "frame.number"])
        total_responses = len([l for l in output.strip().split('\n') if l])
        
        # Get DNS query names
        output = self.run_tshark_command(["-Y", "dns.qry.name", "-T", "fields", "-e", "dns.qry.name"])
        domains = [d for d in output.strip().split('\n') if d]
        
        # Count domain frequencies
        domain_counts = defaultdict(int)
        for domain in domains:
            domain_counts[domain] += 1
        
        top_domains = sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Calculate DNS response time (simplified)
        failed_queries = total_queries - total_responses
        success_rate = round((total_responses / total_queries * 100), 2) if total_queries > 0 else 0
        
        self.analysis_results["dns_analysis"] = {
            "total_queries": total_queries,
            "successful_queries": total_responses,
            "failed_queries": failed_queries,
            "success_rate": success_rate,
            "top_domains": [{"domain": d, "count": c} for d, c in top_domains]
        }
        
        # Generate DNS insights
        if success_rate < 90 and total_queries > 10:
            self.analysis_results["insights"].append({
                "type": "dns_issue",
                "severity": "medium",
                "title": "DNS Resolution Issues",
                "description": f"DNS success rate is {success_rate}%, indicating potential DNS server problems.",
                "confidence": 75
            })
    
    def analyze_http(self):
        """Analyze HTTP/HTTPS traffic"""
        print("📡 Analyzing HTTP/HTTPS traffic...")
        
        # Count HTTP requests
        output = self.run_tshark_command(["-Y", "http.request", "-T", "fields", "-e", "frame.number"])
        total_requests = len([l for l in output.strip().split('\n') if l])
        
        # Get HTTP status codes
        output = self.run_tshark_command(["-Y", "http.response.code", "-T", "fields", "-e", "http.response.code"])
        status_codes = [int(s) for s in output.strip().split('\n') if s.isdigit()]
        
        # Count by status code category
        success_2xx = len([s for s in status_codes if 200 <= s < 300])
        client_4xx = len([s for s in status_codes if 400 <= s < 500])
        server_5xx = len([s for s in status_codes if 500 <= s < 600])
        
        # Get HTTP hosts
        output = self.run_tshark_command(["-Y", "http.host", "-T", "fields", "-e", "http.host"])
        hosts = [h for h in output.strip().split('\n') if h]
        
        host_counts = defaultdict(int)
        for host in hosts:
            host_counts[host] += 1
        
        top_hosts = sorted(host_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        self.analysis_results["http_analysis"] = {
            "total_requests": total_requests,
            "successful_requests": success_2xx,
            "client_errors": client_4xx,
            "server_errors": server_5xx,
            "top_domains": [{"domain": h, "count": c} for h, c in top_hosts]
        }
        
        # Generate HTTP insights
        if server_5xx > 0 and total_requests > 0:
            error_rate = round((server_5xx / total_requests * 100), 2)
            if error_rate > 5:
                self.analysis_results["insights"].append({
                    "type": "http_issue",
                    "severity": "high",
                    "title": "High HTTP Server Error Rate",
                    "description": f"{error_rate}% of HTTP requests resulted in server errors (5xx), indicating application issues.",
                    "confidence": 90
                })
    
    def identify_applications(self):
        """Identify applications based on traffic patterns"""
        print("🎯 Identifying applications...")
        
        applications = {}
        
        # Check for common streaming services
        streaming_domains = {
            "youtube": ["youtube.com", "googlevideo.com", "ytimg.com"],
            "netflix": ["netflix.com", "nflxvideo.net", "nflximg.net"],
            "amazon_prime": ["primevideo.com", "amazon.com"],
            "spotify": ["spotify.com", "scdn.co"],
            "twitch": ["twitch.tv", "ttvnw.net"]
        }
        
        # Check for video conferencing
        conferencing_domains = {
            "zoom": ["zoom.us", "zoom.com"],
            "teams": ["teams.microsoft.com", "skype.com"],
            "meet": ["meet.google.com", "hangouts.google.com"],
            "webex": ["webex.com", "ciscospark.com"]
        }
        
        # Get all DNS queries and HTTP hosts
        dns_domains = []
        if "dns_analysis" in self.analysis_results and "top_domains" in self.analysis_results["dns_analysis"]:
            dns_domains = [d["domain"] for d in self.analysis_results["dns_analysis"]["top_domains"]]
        
        http_domains = []
        if "http_analysis" in self.analysis_results and "top_domains" in self.analysis_results["http_analysis"]:
            http_domains = [d["domain"] for d in self.analysis_results["http_analysis"]["top_domains"]]
        
        all_domains = set(dns_domains + http_domains)
        
        # Match domains to applications
        for app, patterns in {**streaming_domains, **conferencing_domains}.items():
            for domain in all_domains:
                if any(pattern in domain.lower() for pattern in patterns):
                    if app not in applications:
                        applications[app] = {"domains": [], "category": ""}
                    applications[app]["domains"].append(domain)
        
        # Categorize applications
        for app in applications:
            if app in streaming_domains:
                applications[app]["category"] = "streaming"
            elif app in conferencing_domains:
                applications[app]["category"] = "video_conferencing"
        
        self.analysis_results["application_traffic"] = applications
        
        # Generate application insights
        if applications:
            app_list = ", ".join(applications.keys())
            self.analysis_results["insights"].append({
                "type": "application_detection",
                "severity": "info",
                "title": "Applications Detected",
                "description": f"Detected traffic from: {app_list}",
                "confidence": 70
            })
    
    def detect_security_anomalies(self):
        """Detect potential security issues"""
        print("🔒 Detecting security anomalies...")
        
        anomalies = []
        
        # Check for port scanning (many connections to different ports)
        output = self.run_tshark_command(["-Y", "tcp.flags.syn==1 and tcp.flags.ack==0", 
                                         "-T", "fields", "-e", "ip.dst", "-e", "tcp.dstport"])
        syn_packets = [l.split('\t') for l in output.strip().split('\n') if '\t' in l]
        
        # Group by destination IP
        port_scan_candidates = defaultdict(set)
        for ip, port in syn_packets:
            port_scan_candidates[ip].add(port)
        
        # Flag IPs with connections to many ports
        for ip, ports in port_scan_candidates.items():
            if len(ports) > 20:
                anomalies.append({
                    "type": "potential_port_scan",
                    "severity": "medium",
                    "description": f"Detected {len(ports)} connection attempts to different ports on {ip}",
                    "dest_ip": ip,
                    "port_count": len(ports)
                })
        
        # Check for unusual traffic volume to single destination
        output = self.run_tshark_command(["-Y", "ip", "-T", "fields", "-e", "ip.dst", "-e", "frame.len"])
        traffic_by_ip = defaultdict(int)
        for line in output.strip().split('\n'):
            if '\t' in line:
                ip, size = line.split('\t')
                traffic_by_ip[ip] += int(size)
        
        total_traffic = sum(traffic_by_ip.values())
        for ip, bytes_count in traffic_by_ip.items():
            percentage = (bytes_count / total_traffic * 100) if total_traffic > 0 else 0
            if percentage > 50:  # Single IP accounts for >50% of traffic
                anomalies.append({
                    "type": "unusual_traffic_volume",
                    "severity": "low",
                    "description": f"{percentage:.1f}% of traffic directed to {ip}",
                    "dest_ip": ip,
                    "percentage": round(percentage, 2)
                })
        
        self.analysis_results["security_anomalies"] = anomalies
        
        if anomalies:
            self.analysis_results["insights"].append({
                "type": "security",
                "severity": "warning",
                "title": f"{len(anomalies)} Security Anomalies Detected",
                "description": "Potential security issues found in network traffic. Review security anomalies section.",
                "confidence": 60
            })
    
    def generate_summary_insights(self):
        """Generate high-level summary insights"""
        print("💡 Generating summary insights...")
        
        # Overall traffic health
        tcp_analysis = self.analysis_results.get("tcp_analysis", {})
        retrans_rate = tcp_analysis.get("retransmission_rate", 0)
        
        if retrans_rate < 1:
            health_status = "excellent"
            health_desc = "Network traffic shows excellent quality with minimal retransmissions."
        elif retrans_rate < 3:
            health_status = "good"
            health_desc = "Network traffic quality is good with acceptable retransmission rates."
        elif retrans_rate < 5:
            health_status = "fair"
            health_desc = "Network traffic shows some quality issues. Monitor for degradation."
        else:
            health_status = "poor"
            health_desc = "Network traffic quality is poor. Immediate investigation recommended."
        
        self.analysis_results["insights"].insert(0, {
            "type": "summary",
            "severity": "info",
            "title": f"Network Traffic Health: {health_status.upper()}",
            "description": health_desc,
            "confidence": 95
        })
    
    def analyze(self):
        """Run complete analysis"""
        print(f"\n🔬 Starting deep packet analysis of {self.pcap_file}...")
        
        if not os.path.exists(self.pcap_file):
            print(f"❌ Error: PCAP file not found: {self.pcap_file}")
            return None
        
        try:
            self.analyze_basic_stats()
            self.analyze_protocols()
            self.analyze_tcp()
            self.analyze_dns()
            self.analyze_http()
            self.identify_applications()
            self.detect_security_anomalies()
            self.generate_summary_insights()
            
            print(f"\n✅ Analysis complete!")
            print(f"   📦 Total packets: {self.analysis_results['total_packets']}")
            print(f"   📊 Protocols analyzed: {len(self.analysis_results['protocol_distribution'])}")
            print(f"   💡 Insights generated: {len(self.analysis_results['insights'])}")
            
            return self.analysis_results
            
        except Exception as e:
            print(f"❌ Error during analysis: {e}")
            import traceback
            traceback.print_exc()
            return None

def main():
    parser = argparse.ArgumentParser(description="Advanced Packet Analyzer for Smart Fault Analyser")
    parser.add_argument("pcap_file", help="Path to PCAP file to analyze")
    parser.add_argument("--output", "-o", help="Output JSON file path", default=None)
    parser.add_argument("--pretty", "-p", action="store_true", help="Pretty print JSON output")
    
    args = parser.parse_args()
    
    analyzer = PacketAnalyzer(args.pcap_file)
    results = analyzer.analyze()
    
    if results:
        # Determine output file
        if args.output:
            output_file = args.output
        else:
            output_file = args.pcap_file.replace(".pcap", "_analysis.json")
        
        # Write results
        with open(output_file, 'w') as f:
            if args.pretty:
                json.dump(results, f, indent=2)
            else:
                json.dump(results, f)
        
        print(f"\n📄 Analysis saved to: {output_file}")
        
        # Print summary
        print("\n" + "="*60)
        print("ANALYSIS SUMMARY")
        print("="*60)
        for insight in results["insights"]:
            severity_icon = {"info": "ℹ️", "warning": "⚠️", "medium": "⚠️", "high": "🔴", "critical": "🔴"}.get(insight["severity"], "•")
            print(f"{severity_icon} {insight['title']}")
            print(f"   {insight['description']}")
            print()
    else:
        print("❌ Analysis failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
