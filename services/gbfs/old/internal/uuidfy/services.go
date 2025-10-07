package uuidfy

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
)

// UUIDfy generates a deterministic UUIDv5-like string from the input.
func UUIDfy(otherid string) (string, error) {
	if otherid == "" {
		return "", fmt.Errorf("input string is empty")
	}

	// Use SHA-1 hash of the input string
	h := sha1.New()
	h.Write([]byte(otherid))
	hash := h.Sum(nil)

	// Format as UUID: 8-4-4-4-12 (36 chars)
	uuid := make([]byte, 36)
	hexstr := hex.EncodeToString(hash)

	// Fill UUID string
	copy(uuid[0:8], hexstr[0:8])
	uuid[8] = '-'
	copy(uuid[9:13], hexstr[8:12])
	uuid[13] = '-'
	copy(uuid[14:18], hexstr[12:16])
	uuid[18] = '-'
	copy(uuid[19:23], hexstr[16:20])
	uuid[23] = '-'
	copy(uuid[24:36], hexstr[20:32])

	return string(uuid), nil
}
