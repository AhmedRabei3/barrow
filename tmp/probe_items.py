import sys
import urllib.error
import urllib.parse
import urllib.request

base_url = sys.argv[1]
if len(sys.argv) > 2:
    query = urllib.parse.urlencode(
        [tuple(argument.split("=", 1)) for argument in sys.argv[2:]],
        doseq=True,
    )
    url = f"{base_url}?{query}"
else:
    url = base_url

try:
    with urllib.request.urlopen(url) as response:
        print(response.status)
        print(response.read().decode())
except urllib.error.HTTPError as error:
    print(f"HTTP {error.code}")
    print(error.read().decode())
