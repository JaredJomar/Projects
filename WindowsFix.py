import win32evtlog


def retrieve_critical_and_error_logs():
    server = 'localhost'  # Replace with the target server name if needed
    # Replace with the desired log type (e.g., 'Application', 'Security')
    log_type = 'System'

    hand = win32evtlog.OpenEventLog(server, log_type)
    flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ

    critical_and_error_events = []
    total = win32evtlog.GetNumberOfEventLogRecords(hand)

    while True:
        events_batch = win32evtlog.ReadEventLog(hand, flags, 0)
        if not events_batch:
            break

        for event in events_batch:
            critical_and_error_events.append(event)

    win32evtlog.CloseEventLog(hand)

    return critical_and_error_events


def get_event_details(event):
    event_details = {
        'EventID': event.EventID,
        'Source': event.SourceName
    }
    if event.EventType in [1, 2]:
        event_details['Level'] = event.EventType
    return event_details


def main():
    critical_and_error_logs = retrieve_critical_and_error_logs()
    for event in critical_and_error_logs:
        event_details = get_event_details(event)
        print(f"Event ID: {event_details['EventID']}")
        print(f"Source: {event_details['Source']}")
        if 'Level' in event_details:
            print(f"Level: {event_details['Level']}")
        print("-" * 40)

        # Ask Copilot for solutions related to this event (manually follow Copilot's instructions)


if __name__ == "__main__":
    main()
