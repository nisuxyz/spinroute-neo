package main

import (
	"fmt"
	"gbfs-service/internal/uuidfy"
	"log"
)

func main() {
	// Test cases with different inputs
	testCases := []string{
		"test-station-1",
		"network-abc",
		"citybike-station-123",
		"london-bike-share",
		"",
		"simple",
		"very-long-input-string-with-lots-of-characters-to-test-deterministic-behavior",
	}

	fmt.Println("Testing UUIDfy function for deterministic behavior...")
	fmt.Println("============================================================")

	for _, input := range testCases {
		fmt.Printf("\nInput: '%s'\n", input)

		// Generate the same UUID multiple times to verify determinism
		var results []string
		for i := 0; i < 5; i++ {
			uuid, err := uuidfy.UUIDfy(input)
			if err != nil {
				log.Printf("Error for input '%s': %v", input, err)
				break
			}
			results = append(results, uuid)
		}

		// Check if all results are identical
		if len(results) > 0 {
			allSame := true
			firstResult := results[0]

			for i := 1; i < len(results); i++ {
				if results[i] != firstResult {
					allSame = false
					break
				}
			}

			if allSame {
				fmt.Printf("✅ DETERMINISTIC: %s\n", firstResult)
			} else {
				fmt.Printf("❌ NOT DETERMINISTIC:\n")
				for i, result := range results {
					fmt.Printf("   Run %d: %s\n", i+1, result)
				}
			}
		}
	}

	// Additional test: verify same input always produces same output across different runs
	fmt.Println("\n============================================================")
	fmt.Println("Verification test - consistent output for the same input:")

	testInput := "test-network-deterministic"
	fmt.Printf("Input: '%s'\n", testInput)

	uuid1, err1 := uuidfy.UUIDfy(testInput)
	uuid2, err2 := uuidfy.UUIDfy(testInput)

	if err1 != nil || err2 != nil {
		log.Printf("Error during verification test: %v, %v", err1, err2)
		return
	}

	if uuid1 == uuid2 {
		fmt.Printf("✅ CONFIRMED DETERMINISTIC: %s\n", uuid1)
	} else {
		fmt.Printf("❌ FAILED DETERMINISM TEST:\n")
		fmt.Printf("   First call:  %s\n", uuid1)
		fmt.Printf("   Second call: %s\n", uuid2)
	}
}
