# Gemini AI Chatbot Implementation Plan

## Overview
Implement an AI-powered chatbot using Google Gemini API (with OpenAI fallback support) to assist users with trip searches, bookings, and FAQs.

---

## Phase 1: Backend Implementation (6-8 hours)

### Step 1.1: Environment Configuration (30 min)
**Files to modify:**
- `.env`
- `docker-compose.yml`

**Environment Variables:**
```bash
# AI Chatbot Configuration
AI_PROVIDER=gemini                    # Options: "gemini" or "openai"
AI_ENABLED=true                       # Enable/disable chatbot feature

# Gemini Configuration
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash         # or gemini-1.5-pro for better quality
GEMINI_MAX_TOKENS=1024
GEMINI_TEMPERATURE=0.7

# OpenAI Configuration (optional fallback)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini              # or gpt-4 for better quality
OPENAI_MAX_TOKENS=1024
OPENAI_TEMPERATURE=0.7
```

### Step 1.2: Create AI Provider Interface (1 hour)
**New file:** `backend-auth/internal/services/ai_provider.go`

**Interface:**
```go
type AIProvider interface {
    SendMessage(ctx context.Context, request ChatRequest) (*ChatResponse, error)
    GetProviderName() string
}

type ChatRequest struct {
    Message          string   `json:"message"`
    ConversationHistory []Message `json:"conversation_history,omitempty"`
    SystemPrompt     string   `json:"system_prompt,omitempty"`
}

type Message struct {
    Role    string `json:"role"`    // "user" or "assistant"
    Content string `json:"content"`
}

type ChatResponse struct {
    Reply    string `json:"reply"`
    Provider string `json:"provider"`
}
```

### Step 1.3: Implement Gemini Provider (2 hours)
**New file:** `backend-auth/internal/services/gemini_provider.go`

**Key Features:**
- Use Google Generative AI Go SDK: `google.golang.org/generativeai`
- Handle conversation history
- Error handling with retry logic
- Rate limiting protection
- Token usage tracking

**API Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

**Implementation highlights:**
```go
type GeminiProvider struct {
    apiKey      string
    model       string
    maxTokens   int
    temperature float32
    client      *genai.Client
}

func NewGeminiProvider() (*GeminiProvider, error) {
    apiKey := os.Getenv("GEMINI_API_KEY")
    if apiKey == "" {
        return nil, errors.New("GEMINI_API_KEY not set")
    }
    
    ctx := context.Background()
    client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
    if err != nil {
        return nil, err
    }
    
    return &GeminiProvider{
        apiKey:      apiKey,
        model:       getEnv("GEMINI_MODEL", "gemini-1.5-flash"),
        maxTokens:   getEnvInt("GEMINI_MAX_TOKENS", 1024),
        temperature: getEnvFloat32("GEMINI_TEMPERATURE", 0.7),
        client:      client,
    }, nil
}
```

### Step 1.4: Implement OpenAI Provider (Optional, 1.5 hours)
**New file:** `backend-auth/internal/services/openai_provider.go`

**Key Features:**
- Use official OpenAI Go SDK: `github.com/sashabaranov/go-openai`
- Similar structure to Gemini provider
- Fallback option if Gemini fails

### Step 1.5: Create Chatbot Service with Context (2 hours)
**New file:** `backend-auth/internal/services/chatbot_service.go`

**Features:**
```go
type ChatbotService struct {
    provider      AIProvider
    tripRepo      repositories.TripRepository
    routeRepo     repositories.RouteRepository
    bookingRepo   repositories.BookingRepository
    systemPrompt  string
}

func NewChatbotService(
    tripRepo repositories.TripRepository,
    routeRepo repositories.RouteRepository,
    bookingRepo repositories.BookingRepository,
) (*ChatbotService, error) {
    // Factory pattern based on AI_PROVIDER env
    providerType := os.Getenv("AI_PROVIDER")
    
    var provider AIProvider
    var err error
    
    switch providerType {
    case "openai":
        provider, err = NewOpenAIProvider()
    case "gemini", "":
        provider, err = NewGeminiProvider()
    default:
        return nil, fmt.Errorf("unsupported AI provider: %s", providerType)
    }
    
    if err != nil {
        return nil, err
    }
    
    return &ChatbotService{
        provider:     provider,
        tripRepo:     tripRepo,
        routeRepo:    routeRepo,
        bookingRepo:  bookingRepo,
        systemPrompt: getSystemPrompt(),
    }, nil
}

// Key methods:
// - SendMessage(ctx, message, history) - Main chat interface
// - SearchTrips(ctx, origin, dest, date) - Convert query to search
// - GetBookingHelp(ctx, bookingRef) - Booking assistance
// - AnswerFAQ(ctx, question) - FAQ responses
```

**System Prompt Template:**
```
You are a helpful assistant for a bus ticket booking system in Vietnam. 

Your capabilities:
1. Help users search for bus trips between cities
2. Answer questions about booking policies, cancellation, refunds
3. Provide information about available routes and schedules
4. Assist with booking-related questions

Key policies:
- Cancellation allowed up to 24 hours before departure
- Full refund within 24 hours of booking
- Seat selection is first-come-first-served
- Payment methods: Credit card, VNPay, MoMo, PayOS

When users ask about trips, extract:
- Origin city
- Destination city
- Departure date
- Number of passengers (optional)

Be conversational, friendly, and concise. Always provide accurate information.
```

### Step 1.6: Create HTTP Handler (1 hour)
**New file:** `backend-auth/internal/delivery/http/handlers/chatbot_handler.go`

**Endpoints:**
```go
// POST /api/v1/chatbot/message
type ChatMessageRequest struct {
    Message string    `json:"message" binding:"required"`
    History []Message `json:"history,omitempty"`
}

type ChatMessageResponse struct {
    Reply    string    `json:"reply"`
    Provider string    `json:"provider"`
    Context  *TripSearchContext `json:"context,omitempty"`
}

type TripSearchContext struct {
    Origin      string `json:"origin,omitempty"`
    Destination string `json:"destination,omitempty"`
    Date        string `json:"date,omitempty"`
    Passengers  int    `json:"passengers,omitempty"`
}
```

### Step 1.7: Register Routes (15 min)
**Modify:** `backend-auth/cmd/api/main.go`

**Add to container:**
```go
ChatbotService *services.ChatbotService
ChatbotHandler *handlers.ChatbotHandler
```

**Add routes:**
```go
// Chatbot routes
chatbot := api.Group("/chatbot")
{
    chatbot.POST("/message", container.ChatbotHandler.SendMessage)
    chatbot.GET("/health", container.ChatbotHandler.HealthCheck)
}
```

### Step 1.8: Add Dependencies (15 min)
**Update:** `backend-auth/go.mod`

```bash
go get google.golang.org/api/generativeai
go get github.com/sashabaranov/go-openai  # Optional for OpenAI
```

---

## Phase 2: Frontend Implementation (4-6 hours)

### Step 2.1: Create Chatbot Component (2 hours)
**New file:** `frontend-auth/src/components/Chatbot.tsx`

**Features:**
- Floating chat button (bottom-right corner)
- Expandable chat window
- Message history display
- Typing indicator
- Auto-scroll to latest message
- Responsive design (mobile-friendly)

**UI Structure:**
```tsx
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  position?: 'bottom-right' | 'bottom-left';
}

// Components:
// - ChatButton: Floating button with notification badge
// - ChatWindow: Main chat interface
// - MessageList: Scrollable message history
// - MessageBubble: Individual message component
// - ChatInput: Text input with send button
// - TypingIndicator: "Assistant is typing..." animation
```

### Step 2.2: Create API Client (30 min)
**Modify:** `frontend-auth/src/lib/api.ts`

```typescript
export const chatbotAPI = {
  sendMessage: async (message: string, history?: Message[]) => {
    const response = await api.post('/chatbot/message', {
      message,
      history: history?.map(m => ({
        role: m.role,
        content: m.content
      }))
    });
    return response.data;
  },
  
  healthCheck: async () => {
    const response = await api.get('/chatbot/health');
    return response.data;
  }
};
```

### Step 2.3: Create Chat Context (1 hour)
**New file:** `frontend-auth/src/context/ChatbotContext.tsx`

**Features:**
- Global chat state management
- Message history persistence (localStorage)
- Unread message counter
- Chat open/close state

### Step 2.4: Integrate into Layout (30 min)
**Modify:** `frontend-auth/src/components/Layout.tsx`

```tsx
import { Chatbot } from './Chatbot';

export function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <Chatbot position="bottom-right" />
    </>
  );
}
```

### Step 2.5: Add Styling (1 hour)
**Considerations:**
- Smooth animations (slide in/out)
- Dark mode support
- Z-index management (above other content)
- Mobile responsive breakpoints

### Step 2.6: Add Smart Features (1 hour)
**Features:**
- Quick action buttons: "Search trips", "My bookings", "Help"
- Auto-detect trip search intent → Show trip search form
- Link detection (booking references → navigate to booking details)
- Copy message content
- Clear chat history

---

## Phase 3: Testing & Refinement (2 hours)

### Step 3.1: Backend Testing (1 hour)
**Test scenarios:**
- Valid Gemini API key → Successful responses
- Invalid API key → Graceful error handling
- Rate limiting → Proper error messages
- Conversation context → Maintains history
- Trip search extraction → Correct parsing

### Step 3.2: Frontend Testing (30 min)
**Test scenarios:**
- Send message → Receives response
- Conversation history → Persists across sessions
- Mobile responsiveness → Works on small screens
- Multiple users → Independent chat sessions

### Step 3.3: Integration Testing (30 min)
**Scenarios:**
- "Find me a bus from Hanoi to Da Nang tomorrow" → Extracts search params
- "What's your cancellation policy?" → Provides accurate info
- "Help me book 2 seats" → Guides through booking flow

---

## Phase 4: Documentation (1 hour)

### Step 4.1: Update README
**Add section:**
```markdown
## AI Chatbot Feature

### Setup
1. Get Gemini API key from https://makersuite.google.com/app/apikey
2. Add to .env:
   ```
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your-key-here
   ```
3. Restart backend

### Usage
- Click chat button (bottom-right)
- Ask questions about trips, bookings, policies
- Examples:
  - "Show me buses from Hanoi to Da Nang tomorrow"
  - "What's your cancellation policy?"
  - "Help me book a ticket"
```

### Step 4.2: Update Swagger Docs
**Add chatbot endpoints to Swagger**

---

## Configuration Summary

### Backend (.env)
```bash
AI_PROVIDER=gemini
AI_ENABLED=true
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MAX_TOKENS=1024
GEMINI_TEMPERATURE=0.7
```

### Frontend (.env)
```bash
VITE_CHATBOT_ENABLED=true
```

---

## Estimated Time Breakdown

| Phase | Task | Time |
|-------|------|------|
| 1.1 | Environment setup | 30 min |
| 1.2 | AI Provider interface | 1 hour |
| 1.3 | Gemini provider | 2 hours |
| 1.4 | OpenAI provider (optional) | 1.5 hours |
| 1.5 | Chatbot service | 2 hours |
| 1.6 | HTTP handler | 1 hour |
| 1.7 | Route registration | 15 min |
| 1.8 | Dependencies | 15 min |
| 2.1 | Chatbot component | 2 hours |
| 2.2 | API client | 30 min |
| 2.3 | Chat context | 1 hour |
| 2.4 | Layout integration | 30 min |
| 2.5 | Styling | 1 hour |
| 2.6 | Smart features | 1 hour |
| 3 | Testing | 2 hours |
| 4 | Documentation | 1 hour |
| **Total** | | **~17 hours** |

**Minimum viable implementation:** ~10 hours (skip OpenAI, basic UI)

---

## Success Criteria

- ✅ User can chat with AI assistant
- ✅ AI understands trip search queries
- ✅ AI provides accurate policy information
- ✅ Conversation history maintained
- ✅ Works on mobile and desktop
- ✅ Graceful error handling
- ✅ Environment-based provider selection
- ✅ No hardcoded API keys

---

## API Key Setup Guide

### Gemini API Key (Recommended)
1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy key → Add to `.env`
5. Free tier: 60 requests/minute

### OpenAI API Key (Optional)
1. Visit: https://platform.openai.com/api-keys
2. Create new secret key
3. Copy key → Add to `.env`
4. Note: Requires payment setup

---

## Next Steps

1. Get Gemini API key
2. Implement backend (Phase 1)
3. Test with Postman/curl
4. Implement frontend (Phase 2)
5. Integration testing
6. Record demo showing chatbot in action

Would you like me to start implementing any specific phase?
