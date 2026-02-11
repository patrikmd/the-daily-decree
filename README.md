# The Daily Decree

**The Daily Decree** is a satirical, AI-powered political simulation game where you step into the shoes of a newly elected leader. Every turn, Generative AI creates a unique, immersive newspaper reporting on your decisions, world events, and the political climate.

<div align="center">
  <!-- You can add a screenshot here later if you wish -->
  <h3>Lead a Nation. Control the Narrative. survive the Headlines.</h3>
</div>

## 🌟 Key Features

*   **AI-Generated Newspapers**: Each turn generates a complete newspaper with headlines, articles, and opinion pieces tailored to your specific actions and country context.
*   **Dynamic Diplomacy**: Interact with 25 pre-generated countries, each with unique leaders, government types, and diplomatic stances towards you.
*   **Immersive Simulation**: Manage your economy, stability, liberty, and public approval while receiving advice from your AI-generated cabinet.
*   **Visual Storytelling**: The front page features AI-generated images reflecting the main headline in a gritty, high-contrast newspaper style.
*   **Sequential Loading System**: A robust loading process ensures stability by generating complex game data (Narrative -> Diplomacy -> Visuals) in stages, complete with a progress bar.

## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS
*   **AI Engine**: Google Gemini API (`gemini-3-flash-preview` for text, `gemini-2.5-flash-image` for visuals)
*   **State Management**: Local Storage for save games and campaign progress.

## 🚀 Getting Started

Follow these steps to run **The Daily Decree** locally.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   A [Google Cloud Project](https://console.cloud.google.com/) with the Gemini API enabled, or an API key from [Google AI Studio](https://aistudio.google.com/).

### Installation

1.  **Clone the repository** (if applicable) or navigate to the project folder.

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure API Key**:
    *   Create a file named `.env.local` in the root directory.
    *   Add your Gemini API key:
        ```env
        GEMINI_API_KEY=your_actual_api_key_here
        ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

5.  **Play**: Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173` or similar).

## 🎮 How to Play

1.  **Select a Country**: Choose to lead the USA, UK, or Germany.
2.  **Name Your Leader**: Enter a name or let the AI generate one for you.
3.  **The Daily Briefing**: Read the newspaper to understand the current situation.
4.  **Consult Advisors**: Ask your cabinet specific questions about policy or strategy.
5.  **Make Decisions**: Choose from recommended executive actions to shape the future of your nation.
6.  **Survive**: Try to stay in power as long as possible without ruining the country!

## ⚠️ Note on "High Demand" Errors

This game makes extensive use of large language models. To ensure stability, the game initializes in **sequential stages**:
1.  **Newspaper Generation**: The core narrative (approx. 30%).
2.  **Diplomacy Generation**: Intelligence reports for 25 nations (approx. 40%).
3.  **Visual Generation**: The front page image (approx. 30%).
4.  **Finalization**: Assembling the game state.

If you encounter a slight delay on the loading screen, please be patient as the AI constructs your world!
