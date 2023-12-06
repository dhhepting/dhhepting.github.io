from ics import Calendar, Event
import arrow
c = Calendar()
for i in range(10):
    utc = arrow.utcnow()
    local = utc.to('America/Regina')
    e = Event()
    e.name = 'CS-280-202410-' + str(i + 1).zfill(2)
    #e.begin = local
    ebegin = '2023-12-' + str(i + 1).zfill(2) + 'T11:30:00.000-06:00'
    eend = '2023-12-' + str(i + 1).zfill(2) + 'T12:45:00.000-06:00'
    print (ebegin)
    print (eend)
    e.begin = ebegin
    e.end = eend
    c.events.add(e)
    print(e)
print(c.events)
with open('my.ics', 'w') as f:
    f.writelines(c.serialize_iter())