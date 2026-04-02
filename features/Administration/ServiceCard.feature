Feature: Service card display
  A **service card** represents a subscription service attached to a contract.
  It shows the current state of the service and lets the user act on it.

  The card records the following information:

  | Field       | Value        |
  |-------------|--------------|
  | Action      | `added`      |
  | Performed by | `Anonymous` |
  | Date        | `24/10/2023` |

  There can be any number of fields.

  <br />

  Key business rules:
  - A *recently held* card shows a **remove** button
  - A *recently removed* card shows an **add** button
  - Both cards always display the acting user's name and the action date

  @feat:25309
  Scenario: Display recently held service card
    The card for a service that was **recently added** must clearly indicate
    who added it and when, together with the option to remove it.

    When I have a recently held service card
    Then the service card should contain the service name "DRIVER PROTECTION"
    And the service card should contain the button to "remove the service"
    And the service card should contain the name of the person who added the service, namely "Anonymous"
    And the service card should contain the date the service was added, namely "24/10/2023"
    And the card audit trail step is:
      """
      ## Audit trail
      
      The card records the following information:
      
      | Field       | Value        |
      |-------------|--------------|
      | Action      | `added`      |
      | Performed by | `Anonymous` |
      | Date        | `24/10/2023` |
      
      > The date is always formatted as `DD/MM/YYYY`.
      """

  @feat:25309
  Scenario: Display recently removed service card
    When I have a recently removed service card
    Then the service card should contain the service name "DRIVER PROTECTION"
    And the service card should contain the button to "add the service"
    And the service card should contain the name of the person who removed the service, namely "Anonymous"
    And the service card should contain the date the service was removed, namely "24/10/2023"
