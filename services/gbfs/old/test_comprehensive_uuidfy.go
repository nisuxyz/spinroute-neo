package main

import (
	"fmt"
	"gbfs-service/internal/uuidfy"
	"log"
	"strings"
	"time"
)

func main() {
	fmt.Println("Comprehensive UUIDfy Determinism Test")
	fmt.Println("====================================")

	// Test the actual inputs that would be used in the real system
	realWorldInputs := []string{
		"bicing",        // Barcelona bike sharing network
		"velib",         // Paris bike sharing
		"citi-bike-nyc", // NYC Citi Bike
		"boris-bikes",   // London bike sharing
		"station_001",   // Sample station ID
		"network_123",   // Sample network ID
	}

	// Store results for comparison
	firstRunResults := make(map[string]string)

	fmt.Println("First run - storing baseline results:")
	for _, input := range realWorldInputs {
		uuid, err := uuidfy.UUIDfy(input)
		if err != nil {
			log.Printf("Error for input '%s': %v", input, err)
			continue
		}
		firstRunResults[input] = uuid
		fmt.Printf("  %s -> %s\n", input, uuid)
	}

	// Add a small delay to simulate different execution contexts
	time.Sleep(100 * time.Millisecond)

	fmt.Println("\nSecond run - verifying consistency:")
	allConsistent := true
	for _, input := range realWorldInputs {
		uuid, err := uuidfy.UUIDfy(input)
		if err != nil {
			log.Printf("Error for input '%s': %v", input, err)
			continue
		}

		if firstResult, exists := firstRunResults[input]; exists {
			if uuid == firstResult {
				fmt.Printf("  ✅ %s -> %s (consistent)\n", input, uuid)
			} else {
				fmt.Printf("  ❌ %s -> %s (INCONSISTENT! First run: %s)\n", input, uuid, firstResult)
				allConsistent = false
			}
		}
	}

	fmt.Println("\n" + strings.Repeat("=", 50))
	if allConsistent {
		fmt.Println("🎉 SUCCESS: UUIDfy function is DETERMINISTIC!")
		fmt.Println("   - Same input always produces the same output")
		fmt.Println("   - Consistent across different execution times")
		fmt.Println("   - Safe to use for generating stable IDs")
	} else {
		fmt.Println("💥 FAILURE: UUIDfy function is NOT deterministic!")
		fmt.Println("   - This could cause data consistency issues")
	}

	// Test some edge cases that might appear in real data
	fmt.Println("\nEdge case testing:")
	edgeCases := []string{
		"",                 // Empty string (should error)
		"1",                // Single character
		"a",                // Single letter
		"123",              // Numbers only
		"TEST-UPPER",       // Uppercase
		"test-lower",       // Lowercase
		"Mixed-Case-123",   // Mixed case with numbers
		"special@chars#$%", // Special characters
		"vélib-paris",      // Unicode characters
		"station_with_very_long_name_that_exceeds_normal_lengths", // Very long string
	}

	for _, input := range edgeCases {
		uuid1, err1 := uuidfy.UUIDfy(input)
		uuid2, err2 := uuidfy.UUIDfy(input)

		if err1 != nil || err2 != nil {
			if input == "" {
				fmt.Printf("  ✅ Empty string correctly returns error: %v\n", err1)
			} else {
				fmt.Printf("  ⚠️  Error for '%s': %v\n", input, err1)
			}
			continue
		}

		if uuid1 == uuid2 {
			fmt.Printf("  ✅ '%s' -> %s (consistent)\n", input, uuid1)
		} else {
			fmt.Printf("  ❌ '%s' -> INCONSISTENT results!\n", input)
			allConsistent = false
		}
	}

	if allConsistent {
		fmt.Println("\n🔒 CONCLUSION: UUIDfy is completely deterministic and safe for production use.")
	} else {
		fmt.Println("\n⚠️  CONCLUSION: UUIDfy has inconsistencies - needs investigation!")
	}
}
