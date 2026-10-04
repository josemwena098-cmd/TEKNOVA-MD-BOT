# WhatsApp Automation Tool - OLD-STUDIO

Professional WhatsApp Automation Tool with improved two-stage dashboard.

## Features

### Stage 1: Mobile Pairing (Initial Screen)
- Clean, minimal dashboard showing only:
  - Mobile number input field
  - "GENERATE PAIR CODE" button
  - Live console for logs

### Stage 2: Messaging (After Device Linking)
- Message type selector: Single or Multiple numbers
- **Single Number Mode**: Send to one number with custom speed
- **Multiple Numbers Mode**: Add multiple numbers and send bulk messages
- File upload for messages
- Live progress tracking
- Connection status display
- Logout option

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Edit `.env` file if needed (default PORT: 22019)

3. **Start Server**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Open browser: `http://localhost:22019`

## Usage

### Step 1: Initial Screen - Mobile Pairing
1. You will see only the mobile number input field
2. Enter your WhatsApp mobile number (e.g., 923052062145)
3. Click "GENERATE PAIR CODE"
4. Copy the 8-digit code from the console
5. Open WhatsApp > Settings > Linked Devices > Link with phone number
6. Enter the pairing code

### Step 2: After Linking - New Dashboard
Once your device is successfully linked, the dashboard will automatically change to show:
- **SELECT MESSAGE TYPE** section with two options:
  - 📱 SINGLE NUMBER
  - 👥 MULTIPLE NUMBERS

#### Single Number Mode
- Enter victim number
- Set speed (minimum 5 seconds)
- Upload message file (.txt)
- Click "START NOW"

#### Multiple Numbers Mode
- Add multiple numbers one by one using the "+ ADD" button
- Set speed (minimum 5 seconds)
- Upload message file (.txt)
- Click "START NOW"

### Step 3: Monitor Progress
- Watch live console for real-time updates
- View statistics: Rounds, Sent, Failed
- Click "STOP SENDING" to halt the process

## File Format

### Message File (.txt)
Create a `.txt` file with your message content:
```
Hello! This is an automated message.
Please reply if you receive this.
```

## API Endpoints

- `POST /api/pair` - Request pairing code
- `POST /api/start-send` - Start sending messages
- `POST /api/stop-send` - Stop sending messages
- `POST /api/upload-numbers` - Upload numbers file
- `GET /api/status` - Get connection status
- `POST /api/logout` - Logout from WhatsApp

## Important Notes

- **Two-Stage Design**: Stage 1 shows only pairing; Stage 2 appears after successful linking
- **Minimum delay**: 5 seconds between messages (anti-ban protection)
- **Auto-cleaning**: Phone numbers are automatically formatted
- **Session credentials**: Saved locally in `auth_info/` directory
- **Continuous sending**: Messages continue until stopped
- **File uploads**: Temporary files are deleted after use

## Troubleshooting

### Connection Issues
- Check console for detailed error messages
- Re-pair if connection drops
- Ensure WhatsApp is properly linked

### Pairing Code Not Appearing
- Wait 5-10 seconds after clicking "GENERATE PAIR CODE"
- Check browser console for errors
- Try with a different number

### Messages Not Sending
- Verify WhatsApp is properly linked
- Check that numbers are valid
- Ensure message file is in `.txt` format
- Review console logs for specific errors

## Branding

Powered by **OLD-STUDIO**

[Join WhatsApp Channel](https://whatsapp.com/channel/0029VavHzv259PwTIz1XxJ09)

## License

For OLD-STUDIO use only.
