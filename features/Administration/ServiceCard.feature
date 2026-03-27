Feature: Service card display

  @feat:25309
  Scenario: Display recently held service card
    When I have a recently held service card
    Then the service card should contain the service name "DRIVER PROTECTION"
    And the service card should contain the button to "remove the service"
    And the service card should contain the name of the person who added the service, namely "Anonymous"
    And the service card should contain the date the service was added, namely "24/10/2023"

  @feat:25309
  Scenario: Display recently removed service card
    When I have a recently removed service card
    Then the service card should contain the service name "DRIVER PROTECTION"
    And the service card should contain the button to "add the service"
    And the service card should contain the name of the person who removed the service, namely "Anonymous"
    And the service card should contain the date the service was removed, namely "24/10/2023"
