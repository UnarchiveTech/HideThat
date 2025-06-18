# MaskIt: Privacy Control for Social Media

**MaskIt** is a powerful and user-friendly Chrome extension designed to enhance your privacy on major social media platforms. It gives you complete control over your digital identity by allowing you to selectively blur or replace your username, full name, and other sensitive words.

![MaskIt Screenshot](httpsp://example.com/screenshot.png) <!-- Replace with an actual screenshot URL if available -->

---

## Key Features

- **Platform-Specific Settings**: Customize masking rules independently for Instagram, Twitter/X, and LinkedIn.
- **Dual Masking Modes**:
  - **Blur Mode**: Obscures text with a blur effect that reveals the content on mouse hover.
  - **Replace Mode**: Swaps text with a custom placeholder (e.g., `[username]`).
- **Global Custom Word List**: Define a global, comma-separated list of words (like project names or company affiliations) to be masked across all supported platforms.
- **Intelligent & Interactive UI**:
  - **Context-Aware Popup**: Automatically switches to the correct settings tab based on the site you're visiting.
  - **Conditional Controls**: "Replace with" text fields only appear when the "Replace" mode is selected, keeping the UI clean.
- **Dynamic Content Handling**: Automatically detects and masks new content loaded on the page (e.g., via infinite scroll) without needing a refresh.
- **Manual Override**: A **"Force Re-scan Page"** button lets you manually re-apply masking rules at any time.
- **Smart Icon State**: The extension icon in your toolbar activates only when you are on a supported site *and* a masking feature is enabled.
- **Quick-Add via Context Menu**: Right-click any selected text on a page and choose "Add to MaskIt" to instantly add it to your global custom words list.
- **Keyboard Shortcuts**: Use powerful shortcuts to improve your workflow.

## Supported Platforms

- **Instagram**
- **Twitter / X**
- **LinkedIn**

## Installation

1.  **Download the Extension**: Get the latest release from the [Chrome Web Store](#) or download the source code from this repository.
2.  **For Developers (Loading Unpacked)**:
    -   Navigate to `chrome://extensions` in your browser.
    -   Enable **"Developer mode"** using the toggle in the top-right corner.
    -   Click the **"Load unpacked"** button.
    -   Select the directory containing the extension's files (e.g., the `HideThat-master` folder).

## How to Use

1.  **Navigate** to a supported platform (like a Twitter/X profile page).
2.  **Click the MaskIt icon** in your Chrome toolbar to open the popup.
3.  The popup will automatically open to the correct tab for the site you are on.
4.  **Use the toggle switches** to enable or disable masking for the Username, Full Name, or Custom Words.
5.  **Choose your mode**: Select "Blur" to obscure text or "Replace" to use a placeholder. The "Replace" text field will appear when you select it.
6.  Your settings are saved automatically and applied in real-time.

### Keyboard Shortcuts

- **Force Re-scan Page** (`Ctrl+Shift+H`): Manually re-applies all your current settings to the page. Useful for dynamic content or after changing a setting.
- **Toggle Masking On/Off** (`Ctrl+Shift+X`): Instantly activates or deactivates username and full name masking for the current site. A great way to quickly view the original content without changing your saved defaults.

*Note: Shortcuts can be customized at `chrome://extensions/shortcuts`.*

## Privacy Policy

Your privacy is the entire point of this extension. **MaskIt operates entirely on your local machine.**

- All settings are stored locally on your computer using `chrome.storage.sync`.
- The extension does not collect, store, or transmit any of your personal data or browsing activity to any external server.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details. 