from colorama import Fore, Style, init
from pyfiglet import Figlet

# Initialize colorama
init(autoreset=True)

# Define your colors
red = Fore.RED
cyan = Fore.CYAN
yellow = Fore.YELLOW
green = Fore.GREEN
reset = Style.RESET_ALL

# Create ASCII text for "ProForce"
f = Figlet(font='slant')  # You can try other fonts like 'standard', 'banner3-D', etc.
ascii_text = f.renderText("ProPhispher")

# Print the logo in color
print(f"{cyan}{ascii_text}{yellow}[v1.0]{reset}")
print(f"{green}By KasRoudra{reset}")
