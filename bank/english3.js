// English: grammar items at ЕНТ level (inversion, infinitives, gerunds, mixed conditionals, agreement).
const { s } = require('./h');

module.exports = [
  s('Scarcely had the concert begun ___ the lights went out.', ['when', 'than', 'that', 'as'], 0, 'Scarcely / hardly … when.'),
  s('The suspect is believed ___ the country last week.', ['to leave', 'to have left', 'leaving', 'left'], 1, 'A past action after a passive reporting verb: perfect infinitive.'),
  s('I object ___ like a child.', ['to treat', 'being treated', 'to being treated', 'to be treat'], 2, 'Object to + -ing; passive meaning: to being treated.'),
  s('If he hadn\'t missed the train, he ___ here now.', ['would be', 'would have been', 'will be', 'had been'], 0, 'Mixed conditional: past condition, present result.'),
  s('The number of students in our school ___ increased this year.', ['have', 'has', 'are', 'were'], 1, '"The number of" takes a singular verb.'),
  s('She\'d rather ___ at home tonight.', ['stay', 'to stay', 'staying', 'stayed'], 0, 'Would rather + bare infinitive (same subject).'),
  s('No sooner had we sat down ___ the phone rang.', ['when', 'than', 'then', 'that'], 1, 'No sooner … than.')
];
