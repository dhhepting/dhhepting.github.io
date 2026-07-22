from pynput import keyboard

while True:
    event = keyboard.read_event()
    if event.event_type == keyboard.KEY_DOWN:
        key = event.name
        print(f'Pressed: {key}')
        if key == 'q':
            break