-- Seed the first Salon week: Stoicism
-- week_of = Monday Feb 10, 2026

INSERT INTO salon_weeks (
  week_of,
  parlor_title,
  parlor_body,
  parlor_quote,
  parlor_quote_attribution,
  parlor_further_reading,
  parlor_sources
) VALUES (
  '2026-02-10'::date,
  'Stoicism',
  E'In 300 BCE, a merchant named Zeno lost everything when his ship sank near Athens. Wandering the city, he walked into a bookshop and picked up a book about Socrates. He asked the shopkeeper where he could find such a man. The shopkeeper pointed out the window to a scraggly figure hobbling past: Crates the Cynic. Zeno followed him and never looked back.\n\nZeno had arrived in a world falling apart. Alexander the Great had died twenty years earlier, and his empire had collapsed into decades of war among his generals. The Greek city-states that once gave citizens a role in public life now answered to distant kings. You could lose your property, your standing, your life, on the whim of powers you would never meet. Aristotle had argued that a flourishing life required not just virtue but also health, friends, and civic standing. But those conditions assumed a political order stable enough to sustain them, and that order was gone.\n\nZeno asked a harder question: what if genuine good has to be something that benefits you no matter what happens? Health fails that test. You can be healthy and waste your life. Wealth fails it. You can be rich and be destroyed by what your money makes possible. The Stoics concluded that only four things always benefit their possessor: wisdom, justice, courage, and moderation. These they called virtues, and they declared that virtue alone constitutes a good life. Everything else, health, wealth, reputation, even life itself, they classified as "indifferent." Not worthless. The Stoics were precise about this. Health has value and is naturally worth pursuing. But it is a different kind of value from goodness. You select health the way you select a preferred option; you choose virtue the way you choose how to live. The first can be lost. The second cannot be taken from you.\n\nThe Stoics meant this not as a theory for scholars to debate but as a discipline anyone could practice regardless of circumstance. Epictetus was born a slave. His master broke his leg; he walked with a limp for the rest of his life. After gaining his freedom he founded a school that drew students from across the Roman world. What Stoicism gave him was not endurance for its own sake but a framework in which his master''s power over his body was irrelevant to the life he could build with his mind. Four centuries after Zeno, Marcus Aurelius put the same framework to a different test. He governed Rome during a plague that killed millions, wars along the Danube frontier, and the rebellion of his most trusted general, Avidius Cassius. He had real power over real outcomes, the ability to command armies and set policy. What he could not control was whether the plague would stop, whether Cassius would betray him, whether his policies would outlast his reign. The Meditations are his private record of trying to act justly and govern well while releasing his grip on the results he could not guarantee.\n\nNietzsche saw something darker in all of this. He called Stoicism "self-tyranny": a life spent policing your own responses, training yourself not to want, not to grieve, not to rage. To lower the level of your pain, he argued, you must also lower your capacity for joy. And suffering is not a malfunction to be corrected through better judgment. It is the condition for growth. A tree that grows tall cannot do without storms. Strip away the pain and you do not get freedom. You get a smaller life. There is also a political question that follows anyone who takes Stoic practice seriously. If your own judgment is the only thing that can truly harm you, what happens when you witness real injustice? Does this discipline make you clearer and more effective in fighting it, or does it quietly give you permission to endure what you should be refusing to accept?',
  'Some things are within our power, while others are not. Within our power are opinion, motivation, desire, aversion, and, in a word, whatever is of our own doing. Not within our power are our body, our property, reputation, office, and, in a word, whatever is not of our own doing.',
  'Epictetus, Enchiridion',
  '[
    {"title": "Enchiridion", "author": "Epictetus", "description": "the essential handbook"},
    {"title": "Meditations", "author": "Marcus Aurelius", "description": "philosophy as private practice"},
    {"title": "Letters to Lucilius", "author": "Seneca", "description": "moral advice in elegant prose"}
  ]'::jsonb,
  '[
    {"label": "Stanford Encyclopedia of Philosophy: Stoicism", "url": "https://plato.stanford.edu/entries/stoicism/"},
    {"label": "Stanford Encyclopedia of Philosophy: Marcus Aurelius", "url": "https://plato.stanford.edu/entries/marcus-aurelius/"},
    {"label": "Internet Encyclopedia of Philosophy: Stoic Ethics", "url": "https://iep.utm.edu/stoiceth/"},
    {"label": "Internet Encyclopedia of Philosophy: Stoicism", "url": "https://iep.utm.edu/stoicism/"},
    {"label": "Nietzsche, Beyond Good and Evil, \u00a79", "url": "https://www.gutenberg.org/files/4363/4363-h/4363-h.htm"},
    {"label": "Philosophize This!, Episode #011: The Early Stoa and the Cynics", "url": "https://www.philosophizethis.org/podcast/the-early-stoa-72e6f"},
    {"label": "Philosophize This!, Episode #012: Hallmarks of Stoic Ethics", "url": "https://www.philosophizethis.org/podcasts"},
    {"label": "Philosophize This!, Episode #237: The Stoics Are Wrong", "url": "https://open.spotify.com/episode/4HaklWseakPbpglhSWDRQ6"}
  ]'::jsonb
);
