Feature: Input validation with regex patterns
  Screenshot: ![Screenshot](./screenshots/feature-page.png)

  Scenario: Validate a field using a regex pattern in step text
    Given a field matching pattern "\(\d+\)"
    When I validate input "(123)"
    Then the validation succeeds

  Scenario: Validate patterns stored in a table
    Given the following validation rules:
      | pattern     | description              |
      | \(\d+\)     | parenthesised digits     |
      | ^\d{3}$     | exactly three digits     |
      | \w+@\w+\.\w | simple email-like format |
    When I apply the validation rules
    Then all rules are applied correctly
