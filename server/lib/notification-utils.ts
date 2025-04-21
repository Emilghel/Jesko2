// Utility functions for generating member join notifications

// Keep track of recently used usernames to prevent repetition
const recentUsernames = new Set<string>();
const MAX_RECENT_USERNAMES = 50; // Remember the last 50 usernames

// First names for username generation
const firstNames = [
  // Common first names
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark',
  'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
  'George', 'Timothy', 'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan', 'Jacob',
  'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott',
  'Brandon', 'Benjamin', 'Samuel', 'Gregory', 'Alexander', 'Patrick', 'Frank',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica',
  'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Sandra', 'Margaret', 'Ashley',
  'Kimberly', 'Emily', 'Donna', 'Michelle', 'Carol', 'Amanda', 'Dorothy', 'Melissa',
  'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia', 'Kathleen', 'Amy',
  'Angela', 'Shirley', 'Anna', 'Ruth', 'Brenda', 'Pamela', 'Nicole', 'Katherine',
  'Samantha', 'Christine', 'Emma', 'Catherine', 'Debra', 'Virginia', 'Rachel', 'Carolyn',
  'Janet', 'Maria', 'Heather', 'Diane', 'Julie', 'Joyce', 'Victoria', 'Kelly', 'Christina'
];

// Last names for username generation
const lastNames = [
  // Common last names
  'Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson',
  'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
  'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee',
  'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez',
  'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter',
  'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans',
  'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook',
  'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox',
  'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson',
  'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross',
  'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes',
  'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Gonzales', 'Bryant', 'Alexander',
  'Russell', 'Griffin'
];

// Optional professional title for more formal names
const professionalTitles = [
  'Dr', 'Prof', 'Atty', 'Rev', 'Coach', 'Capt', 'Chief', 'Dir'
];

// Optional username decorators
const decorators = [
  'Pro', 'Expert', 'Official', 'Real', 'The', 'Original', 'Elite', 'Prime', 
  'Master', 'Super', 'Digital', 'Tech', 'Biz', 'Creative'
];

// List of membership plans
const membershipPlans = [
  'AI Secretary Starter',
  'AI Secretary Pro',
  'AI Secretary Enterprise',
  'Starter Plan',
  'Pro Plan',
  'Enterprise Plan'
];

// Actions users can take
const userActions = [
  'just joined with the',
  'just subscribed to the',
  'activated the',
  'upgraded to the',
  'started using the'
];

/**
 * Generates a realistic username based on common naming patterns
 * and ensures it has not been recently used
 */
export function generateRandomUsername(): string {
  // Try up to 20 times to generate a unique username
  for (let attempt = 0; attempt < 20; attempt++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // Decide on username style
    const style = Math.floor(Math.random() * 8); // 0-7 different styles
    
    let username = '';
    
    switch (style) {
      case 0: // First initial + Last name (JSmith)
        username = firstName.charAt(0) + lastName;
        break;
        
      case 1: // First name + Last initial (JohnS)
        username = firstName + lastName.charAt(0);
        break;
        
      case 2: // First name + Last name (JohnSmith)
        username = firstName + lastName;
        break;
        
      case 3: // First name + Last name + Number (JohnSmith42)
        const number = Math.floor(Math.random() * 999) + 1;
        username = firstName + lastName + number;
        break;
        
      case 4: // Professional Title + Last name (DrSmith)
        const useTitle = Math.random() < 0.7; // 70% chance
        const title = useTitle 
          ? professionalTitles[Math.floor(Math.random() * professionalTitles.length)] 
          : '';
        username = title + lastName;
        break;
        
      case 5: // Decorator + First name + Last name (RealJohnSmith)
        const decorator = decorators[Math.floor(Math.random() * decorators.length)];
        username = decorator + firstName + lastName;
        break;
        
      case 6: // First name + Last name + Decorator (JohnSmithOfficial)
        const postDecorator = decorators[Math.floor(Math.random() * decorators.length)];
        username = firstName + lastName + postDecorator;
        break;
        
      case 7: // First name + Underscore + Last name (John_Smith)
        username = firstName + '_' + lastName;
        break;
        
      default:
        username = firstName + lastName;
    }
    
    // Sometimes add periods instead of running names together
    if (Math.random() < 0.15 && username.length > 8) { // 15% chance and name is long enough
      username = username.replace(/([A-Z])/g, '.$1').replace(/^\./, '');
    }
    
    // Check if this username is unique (not in our recent set)
    if (!recentUsernames.has(username)) {
      // Add to recent usernames
      recentUsernames.add(username);
      
      // If we've exceeded our maximum, remove the oldest (first added) username
      if (recentUsernames.size > MAX_RECENT_USERNAMES) {
        // Get the first item and remove it (Sets maintain insertion order in modern JS)
        const firstItem = recentUsernames.values().next().value;
        recentUsernames.delete(firstItem);
      }
      
      return username;
    }
  }
  
  // If we failed to generate a unique username after many attempts,
  // just generate a very random one with a timestamp to ensure uniqueness
  const randomName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const timestamp = Date.now().toString().slice(-6);
  return `${randomName}${timestamp}`;
}

/**
 * Generates a random membership plan
 */
export function generateRandomPlan(): string {
  return membershipPlans[Math.floor(Math.random() * membershipPlans.length)];
}

/**
 * Generates a random action
 */
export function generateRandomAction(): string {
  return userActions[Math.floor(Math.random() * userActions.length)];
}

/**
 * Generates a complete member join notification
 */
export function generateMemberJoinNotification() {
  const username = generateRandomUsername();
  const plan = generateRandomPlan();
  const action = generateRandomAction();
  
  return {
    username,
    plan,
    action,
    message: `${username} ${action} ${plan}`
  };
}