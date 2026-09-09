DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.categories (slug, name, description) VALUES
 ('notes','Lecture Notes','Full lecture notes and summaries for each unit.'),
 ('past-papers','Past Papers','Previous CATs and end-of-semester examination papers.'),
 ('assignments','Assignments','Assignment briefs, questions and marking guides.'),
 ('slides','Lecture Slides','Slide decks used during lectures.'),
 ('references','Reference Material','Textbook extracts, articles and extra reading.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.units (code, name, lecturer, year, semester, description) VALUES
 ('BBIT2101','Database Systems','Dr. Alice Wanjiru',2,1,'Relational modelling, normalisation, SQL and transaction management.'),
 ('BBIT2102','Object Oriented Programming','Mr. Peter Otieno',2,1,'Classes, inheritance, polymorphism and design principles in Java.'),
 ('BBIT2103','Data Communication and Networks','Eng. Grace Mumo',2,1,'OSI and TCP/IP models, addressing, routing and network security basics.'),
 ('BBIT2104','Systems Analysis and Design','Dr. Samuel Kariuki',2,1,'Requirements gathering, modelling, and the systems development lifecycle.'),
 ('BBIT2105','Business Statistics','Ms. Faith Njeri',2,1,'Descriptive statistics, probability, sampling and hypothesis testing.'),
 ('BBIT2106','Web Application Development','Mr. Brian Mwangi',2,1,'HTML, CSS, JavaScript and server-side application development.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.timetable (unit_id, day_of_week, start_time, end_time, venue, lecturer)
SELECT u.id, v.dow, v.st::time, v.et::time, v.venue, u.lecturer FROM (VALUES
 ('BBIT2101',1,'08:00','10:00','LT 1'),
 ('BBIT2102',1,'10:00','12:00','Lab 3'),
 ('BBIT2103',2,'08:00','10:00','LT 2'),
 ('BBIT2104',2,'14:00','16:00','LT 1'),
 ('BBIT2105',3,'08:00','10:00','LT 4'),
 ('BBIT2106',3,'11:00','13:00','Lab 2'),
 ('BBIT2101',4,'14:00','16:00','Lab 1'),
 ('BBIT2106',5,'09:00','11:00','Lab 2')
) AS v(code,dow,st,et,venue) JOIN public.units u ON u.code = v.code;

INSERT INTO public.announcements (title, body, status) VALUES
 ('Semester CAT schedule released','CAT 1 for all Year 2 Semester 1 units runs in week six. Check the timetable page for venues and confirm your unit registration before then.','published'),
 ('Database Systems practical groups','Lab sessions for BBIT2101 are split into two groups. Group A attends Monday, Group B attends Thursday. Bring your own laptop where possible.','published'),
 ('Library extended hours','The library now closes at 10pm on weekdays during the revision period. Study rooms can be booked at the front desk.','published'),
 ('Web Development project brief','The group project brief for BBIT2106 is available under Assignments. Groups of four, proposals due end of week four.','published');