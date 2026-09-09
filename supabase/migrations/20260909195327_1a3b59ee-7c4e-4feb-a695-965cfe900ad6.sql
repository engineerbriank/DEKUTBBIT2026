INSERT INTO public.resources (title, description, topic, lecturer, category_id, unit_id, file_path, file_name, file_size, mime_type, status)
SELECT v.title, v.description, v.topic, v.lecturer, c.id, u.id, 'seed/'||v.file, v.file, v.size, 'application/pdf', 'published'
FROM (VALUES
 ('Database Systems: Normalisation Notes','Full lecture notes covering functional dependencies and normal forms up to BCNF with worked examples.','Normalisation','Dr. Alice Wanjiru','notes','BBIT2101','bbit2101-normalisation-notes.pdf',3452),
 ('Database Systems CAT 1 Past Paper','Previous CAT 1 paper with five questions on ER modelling, SQL joins, aggregation and transactions.','SQL and modelling','Dr. Alice Wanjiru','past-papers','BBIT2101','bbit2101-sql-past-paper.pdf',2069),
 ('Object Oriented Programming: Core Concepts','Notes on encapsulation, inheritance, polymorphism and abstraction with Java code walkthroughs.','Classes and inheritance','Mr. Peter Otieno','notes','BBIT2102','bbit2102-oop-notes.pdf',2680),
 ('OOP Assignment 1: Library System','Assignment brief for a Java library system, with deliverables and a marking guide.','Design and implementation','Mr. Peter Otieno','assignments','BBIT2102','bbit2102-assignment-one.pdf',1816),
 ('Data Communication: OSI and TCP/IP','Layer-by-layer notes on the OSI and TCP/IP models, addressing, and common protocols.','Network models','Eng. Grace Mumo','notes','BBIT2103','bbit2103-networking-notes.pdf',2370),
 ('Systems Analysis: Requirements Slides','Lecture slides on eliciting, documenting and validating system requirements.','Requirements engineering','Dr. Samuel Kariuki','slides','BBIT2104','bbit2104-sad-slides.pdf',2040),
 ('Business Statistics: Hypothesis Testing','Notes on sampling distributions, confidence intervals and hypothesis tests with worked examples.','Inference','Ms. Faith Njeri','notes','BBIT2105','bbit2105-statistics-notes.pdf',2258),
 ('Web Development Group Project Brief','Group project brief for a full-stack web application, including scope, milestones and grading.','Group project','Mr. Brian Mwangi','assignments','BBIT2106','bbit2106-web-project-brief.pdf',1725),
 ('Web Development Reference Sheet','Quick reference on HTTP methods, status codes, forms and client versus server responsibilities.','HTTP and the browser','Mr. Brian Mwangi','references','BBIT2106','bbit2106-web-reference.pdf',1839)
) AS v(title,description,topic,lecturer,cat,code,file,size)
JOIN public.categories c ON c.slug = v.cat
JOIN public.units u ON u.code = v.code
WHERE NOT EXISTS (SELECT 1 FROM public.resources r WHERE r.file_path = 'seed/'||v.file);