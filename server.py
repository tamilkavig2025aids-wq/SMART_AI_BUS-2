import http.server
import socketserver
import webbrowser
import os
import sys

PORT = int(os.environ.get("PORT", 8000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)
    # Enable address reuse
    socketserver.TCPServer.allow_reuse_address = True
    
    port = PORT
    for attempt in range(5):
        try:
            with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
                url = f"http://localhost:{port}"
                print("=" * 65)
                print(f"  Smart Bus Automation Tracking System is running at:")
                print(f"  --> {url}")
                print("=" * 65)
                print("  Press Ctrl+C to stop the server.")
                print("=" * 65)
                webbrowser.open(url)
                httpd.serve_forever()
                break
        except OSError:
            port += 1

if __name__ == "__main__":
    run_server()
