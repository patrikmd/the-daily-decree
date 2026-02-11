export type Country = 'USA' | 'UK' | 'GERMANY';

export interface GameStats {
  economy: number;   // 0-100
  stability: number; // 0-100
  liberty: number;   // 0-100
  approval: number;  // 0-100
}

export interface NewspaperStory {
  headline: string;
  subhead?: string; // Optional deck/subhead
  content: string;  // Longer text
  author?: string;
  category?: string; // e.g. "World", "Local", "Business"
}

export interface MarketItem {
  name: string;
  value: string;
  change: string; // e.g. "+2.4%" or "-0.5"
  trend: 'up' | 'down' | 'neutral';
}

export interface Character {
  name: string;
  role: string; // e.g. "President", "Opposition Leader", "General"
  description?: string;
}

export interface RecommendedAction {
  text: string;
  recommender: string; // e.g. "Secretary of Defense Gen. Miller"
}

export interface AdvisorOpinion {
  advisorName: string;
  role: string;
  advice: string;
}


export interface NewspaperData {
  issueDate: string;
  issueNumber: number;
  newspaperName: string;
  country: Country;

  // Persistent Memory
  characters: Character[];

  // State Data

  // Player choices
  recommendedActions: RecommendedAction[];

  // Page 1 Content
  mainStory: NewspaperStory & { visualPrompt: string };
  editorial: NewspaperStory;

  // Page 2 Content
  worldNews: NewspaperStory[];
  localNews: NewspaperStory[];

  // Page 3 Content
  businessNews: NewspaperStory[];
  marketData: {
    indices: MarketItem[];
    commodities: MarketItem[];
    currencies: MarketItem[];
  };

  imageUrl?: string; // Base64 image data for main story

  stats: GameStats;
  gameOver: boolean;
  gameOverReason?: string;
}

export interface TurnHistory {
  turnNumber: number;
  playerAction: string;
  resultSummary: string;
}

export enum GameState {
  INIT,
  PLAYING,
  LOADING,
  GAME_OVER
}

// Save System Types
export interface SaveMetadata {
  id: string;
  name: string;      // User visible name
  leaderName: string;
  country: Country;
  turnCount: number;
  timestamp: number; // Last saved
}

export interface SaveFile {
  metadata: SaveMetadata;
  gameState: GameState;
  data: NewspaperData;
  history: TurnHistory[];
  turnCount: number;
  selectedCountry: Country;
}