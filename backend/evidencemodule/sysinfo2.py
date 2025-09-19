import psutil

def list_processes():
    print(f"{'PID':<10} {'Name':<30} {'Status':<15} {'Memory %':<10} {'CPU %':<10}")
    print("-" * 80)

    for proc in psutil.process_iter(['pid', 'name', 'status', 'memory_percent', 'cpu_percent']):
        try:
            pid = proc.info['pid']
            name = proc.info['name']
            status = proc.info['status']
            memory = round(proc.info['memory_percent'], 2)
            cpu = proc.info['cpu_percent']

            print(f"{pid:<10} {name:<30} {status:<15} {memory:<10} {cpu:<10}")

        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass


if __name__ == "__main__":
    list_processes()
