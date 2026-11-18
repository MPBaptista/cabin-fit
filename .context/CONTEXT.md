# Cabin-Fit Project

## Overview
A simple web tool that calculates whether a cabin bag meets airline dimension limits. It helps travelers verify their bag dimensions before heading to the airport.

## Project Structure
- **`index.html`** — Main page with the calculator and results display
- **`styles.css`** — CSS styles for the page
- **`script.js`** — JavaScript logic for dimension calculations
- **`airline-data.json`** — Reference data for common airline cabin bag limits
- **`package.json`** — Project dependencies and scripts

## Key Logic
The calculator takes bag dimensions (length, width, height) and compares them against airline limits. It:
1. Validates input (positive numbers, reasonable ranges)
2. Retrieves airline-specific limits from the data file
3. Calculates if the bag fits (typically sum of L+W+H ≤ airline limit)
4. Returns a clear yes/no result with margin information

## Important Conventions
- Uses vanilla JavaScript (no frameworks)
- Single-page architecture, no build step
- Data is static JSON that can be updated manually
- Uses standard CSS flexbox/grid layouts
- Results are displayed with color indicators (green=fit, red=over limit)

## Testing
- The test suite lives in `tests/` folder
- Running `npm test` executes the test suite
- Tests cover edge cases like very large bags, negative dimensions, zero bags

## Common Tasks
- Adding a new airline to the data file
- Updating dimension calculation logic
- Fixing CSS layout issues
- Adding new features (e.g., multiple bags, carry-on vs personal item)

## Dependencies
- Minimal dependencies: `npm` for testing and possibly a UI framework like Vue if added later

## Notes
- The calculator likely uses a simple formula: L + W + H ≤ airline_limit
- Some airlines use different formulas (e.g., diameter × height for cylindrical bags)
- The data file should be kept updated as airline rules change
- Edge cases: oversized bags, very thin bags (flat items), irregular shapes