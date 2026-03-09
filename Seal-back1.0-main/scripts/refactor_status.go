package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var replacements = map[string]string{
	`"พร้อมใช้งาน"`:  "string(constants.StatusReady)",
	`"จ่าย"`:         "string(constants.StatusIssued)",
	`"ติดตั้งแล้ว"`:  "string(constants.StatusInstalled)",
	`"ใช้งานแล้ว"`:   "string(constants.StatusUsed)",
	`"เสียหาย"`:      "string(constants.StatusDamaged)",
	`"สูญหาย"`:       "string(constants.StatusLost)",
	`"รอตรวจสอบคืน"`: "string(constants.StatusPendingReturn)",
}

func main() {
	rootDir := `c:\Users\PEA\Desktop\PEAsecSeal\Seal-back1.0-main\internal\service`
	filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(info.Name(), ".go") {
			processFile(path)
		}
		return nil
	})
}

func processFile(path string) {
	contentBytes, err := ioutil.ReadFile(path)
	if err != nil {
		fmt.Printf("Error reading %s: %v\n", path, err)
		return
	}
	content := string(contentBytes)

	changed := false
	for oldStr, newStr := range replacements {
		// Replace only occurrences outside of string concatenation/formats if possible.
		// A safe bet: look for `== "Status"`, `!= "Status"`, `= "Status"`, `case "Status":`, `, "Status"` (arguments), `["Status"]` (map keys)
		patterns := []string{
			`==\s*` + oldStr,
			`!=\s*` + oldStr,
			`=\s*` + oldStr,
			`case\s*` + oldStr + `:`,
			`,\s*` + oldStr,
			`\[` + oldStr + `\]`,
		}
		for _, patternStr := range patterns {
			re := regexp.MustCompile(patternStr)
			content = re.ReplaceAllStringFunc(content, func(match string) string {
				changed = true
				return strings.Replace(match, oldStr, newStr, 1)
			})
		}
	}

	if changed {
		// Add import if not present
		if !strings.Contains(content, `"github.com/Kev2406/PEA/internal/domain/constants"`) {
			// Find the import block
			importRe := regexp.MustCompile(`import \(`)
			if importRe.MatchString(content) {
				content = importRe.ReplaceAllString(content, "import (\n\t\"github.com/Kev2406/PEA/internal/domain/constants\"\n")
			} else {
				// single import
				importReSingle := regexp.MustCompile(`import \".+\"`)
				content = importReSingle.ReplaceAllString(content, "$0\nimport \"github.com/Kev2406/PEA/internal/domain/constants\"")
			}
		}

		err = ioutil.WriteFile(path, []byte(content), infoPerm(path))
		if err != nil {
			fmt.Printf("Error writing %s: %v\n", path, err)
		} else {
			fmt.Printf("Updated %s\n", path)
		}
	}
}

func infoPerm(path string) os.FileMode {
	info, _ := os.Stat(path)
	return info.Mode()
}
