package utils

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
)

// ExpoPushMessage represents the payload for Expo Push API
type ExpoPushMessage struct {
	To    string `json:"to"`
	Title string `json:"title,omitempty"`
	Body  string `json:"body,omitempty"`
	Data  any    `json:"data,omitempty"`
}

// SendExpoPushNotification sends a push notification to an Expo device token
func SendExpoPushNotification(token, title, body string, data map[string]interface{}) error {
	if token == "" || len(token) < 18 || token[:17] != "ExponentPushToken" {
		log.Println("⚠️ [WARNING] Invalid or missing Expo Push Token:", token)
		return errors.New("invalid expo push token")
	}

	message := ExpoPushMessage{
		To:    token,
		Title: title,
		Body:  body,
		Data:  data,
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal push message: %v", err)
	}

	resp, err := http.Post("https://exp.host/--/api/v2/push/send", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("failed to send push request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("expo push api returned status %d", resp.StatusCode)
	}

	log.Printf("✅ [SUCCESS] Sent push notification '%s' to %s\n", title, token)
	return nil
}
