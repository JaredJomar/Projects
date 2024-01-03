# Simple To-Do List Application

# Function to display the menu
def display_menu():
    print("1. Add a task")
    print("2. View list")
    print("3. Mark task as complete")
    print("4. Delete a task")
    print("5. Exit")

# Function to add a task to the list
def add_task():
    task = input("Enter a task: ")
    task_list.append(task)
    print("Task added!")

# Function to view the list
def view_list():
    print("To-Do List:")
    for task in task_list:
        print(task)

# Function to mark a task as complete
def complete_task():
    view_list()
    while True:
        try:
            task = int(input("Enter the number of the task you wish to mark as complete: "))
            if task < 1 or task > len(task_list):
                raise ValueError
            task_list.pop(task - 1)
            print("Task marked as complete!")
            break
        except ValueError:
            print("Invalid task number. Please try again.")

# Function to delete a task
def delete_task():
    view_list()
    while True:
        try:
            task = int(input("Enter the number of the task you wish to delete: "))
            if task < 1 or task > len(task_list):
                raise ValueError
            task_list.pop(task - 1)
            print("Task deleted!")
            break
        except ValueError:
            print("Invalid task number. Please try again.")

# Function to exit the program
def exit_program():
    print("Goodbye!")
    exit()

# Main program
task_list = []
display_menu()
while True:
    try:
        option = int(input("Enter an option: "))
        if option < 1 or option > 5:
            raise ValueError
        menu_options = {
            1: add_task,
            2: view_list,
            3: complete_task,
            4: delete_task,
            5: exit_program
        }
        menu_options[option]()
        print()
        display_menu()
    except ValueError:
        print("Invalid option. Please try again.")
        print()
