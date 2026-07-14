---
name: gherkin-scenario-writer
description: Write high-quality Gherkin acceptance criteria from requirements using clear Given/When/Then behavior, examples, and edge cases. Use when user asks for BDD scenarios, feature files, acceptance criteria, or business-analyst scenario drafting.
---

# Gherkin Scenario Writer

## Writing rules

1. Write behavior, not implementation.
2. Use one business outcome per scenario.
3. Keep `Given` as context, `When` as one trigger, `Then` as observable outcome.
4. Prefer concrete domain language over technical internals.
5. Add negative and boundary scenarios for risk-prone behavior.

## Required output format

```gherkin
Feature: <capability>
  As a <role>
  I want <goal>
  So that <benefit>

  Background:
    Given <shared context>

  @priority:<p1|p2|p3> @type:<happy|negative|edge>
  Scenario: <clear behavior name>
    Given <precondition>
    And <additional precondition>
    When <user/system action>
    Then <observable outcome>
    And <additional observable outcome>

  Scenario Outline: <parametrized behavior>
    Given <context with <value>>
    When <action with <value>>
    Then <result with <expected>>

    Examples:
      | value | expected |
      | ...   | ...      |
```

## Quality checklist

- Scenario names describe business behavior.
- Every `Then` is verifiable by a test.
- No UI locator details, SQL, or internal class names.
- Ambiguities are captured as explicit open questions.
- Tags include priority and scenario type.

## Escalation

If source requirements are ambiguous, return:
- draft scenarios with `@needs-clarification`
- a short question list for missing decisions
