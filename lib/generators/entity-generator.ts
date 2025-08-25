import { faker } from "@/lib/utils/faker-utils";
import { generateFallbackValue } from "@/lib/utils/faker-utils";
import { DataSpec, AttributeSpec } from "@/lib/types/data-spec";
import { EntityCollection, DataRecord } from "@/lib/types/data-types";

export class EntityGenerator {
  private spec: DataSpec;

  constructor(spec: DataSpec) {
    this.spec = spec;
  }

  public generateEntities(rowCount: number): EntityCollection {
    const generatedEntities: EntityCollection = {};

    this.spec.entities.forEach((entitySpec) => {
      // Dynamically adjust entity count based on row count for efficiency.
      // Simple heuristic: 1 entity per 10 rows, with a minimum of 5 and max of 200.
      const entityCount = Math.min(100, Math.max(10, Math.ceil(rowCount / 10)));
      const entities = [];

      for (let i = 0; i < entityCount; i++) {
        const entityInstance: DataRecord = {};
        for (const attrName in entitySpec.attributes) {
          const attrSpec = entitySpec.attributes[attrName];
          entityInstance[attrName] = this.resolveAttribute(
            attrSpec,
            entityInstance
          );
        }
        entities.push(entityInstance);
      }
      generatedEntities[entitySpec.name] = entities;
    });

    return generatedEntities;
  }

  private resolveAttribute(
    spec: AttributeSpec,
    context: DataRecord
  ): string | number | boolean | null {
    switch (spec.type) {
      case "id":
        return `${spec.prefix || ""}${faker.string.uuid()}`;
      case "faker":
        // Handle case where LLM puts real values in method instead of faker method
        if (spec.method && Array.isArray(spec.method)) {
          // This is actually a choice field, not a faker field
          const choiceValues = spec.method;
          const choiceWeights =
            spec.weights || choiceValues.map(() => 1 / choiceValues.length);
          const weightedOptions = choiceValues.map((value, index) => ({
            value,
            weight: choiceWeights[index],
          }));
          return faker.helpers.weightedArrayElement(weightedOptions);
        }

        const [namespace, method] = spec.method!.split(".");
        try {
          if (
            !(faker as any)[namespace] ||
            !(faker as any)[namespace][method]
          ) {
            if (process.env.DEBUG) {
              console.warn(
                `[DataFactory] Invalid faker method: ${spec.method}. Available namespaces:`,
                Object.keys(faker)
              );
            }
            return generateFallbackValue(method, namespace);
          }
          return (faker as any)[namespace][method]();
        } catch (error) {
          if (process.env.DEBUG) {
            console.warn(
              `[DataFactory] Error calling faker method ${spec.method}:`,
              error
            );
          }
          return generateFallbackValue(method, namespace);
        }
      case "choice": {
        // Handle case where LLM puts real values in method instead of values
        let choiceValues: (string | number)[] = spec.values || [];
        let choiceWeights: number[] = spec.weights || [];

        // Check if method contains the real values (LLM format)
        if (spec.method && Array.isArray(spec.method)) {
          choiceValues = spec.method;
          choiceWeights =
            spec.weights || choiceValues.map(() => 1 / choiceValues.length);
        } else if (spec.options && Array.isArray(spec.options)) {
          // Check if options contains the real values
          choiceValues = spec.options;
          choiceWeights =
            spec.weights || choiceValues.map(() => 1 / choiceValues.length);
        } else if (spec.choices && Array.isArray(spec.choices)) {
          // Check if choices contains the real values
          choiceValues = spec.choices;
          choiceWeights =
            spec.weights || choiceValues.map(() => 1 / choiceValues.length);
        } else if (
          !choiceValues.length ||
          !choiceWeights.length ||
          choiceValues.length !== choiceWeights.length
        ) {
          if (process.env.DEBUG) {
            console.warn(
              `[DataFactory] Choice attribute missing values/weights, using fallback`
            );
          }
          // Provide fallback values
          choiceValues = ["Option A", "Option B", "Option C"];
          choiceWeights = [0.4, 0.35, 0.25];
        }

        // Ensure we have valid values and weights
        if (
          !choiceValues.length ||
          !choiceWeights.length ||
          choiceValues.length !== choiceWeights.length
        ) {
          choiceValues = ["Option A", "Option B", "Option C"];
          choiceWeights = [0.4, 0.35, 0.25];
        }

        const weightedOptions = choiceValues.map((value, index) => ({
          value,
          weight: choiceWeights[index],
        }));
        return faker.helpers.weightedArrayElement(weightedOptions);
      }
      case "conditional":
        if (!spec.on || !spec.cases) {
          if (process.env.DEBUG) {
            console.warn(
              `[DataFactory] Missing 'on' or 'cases' for conditional attribute`
            );
          }
          return spec.cases?.["default"] ?? 0;
        }
        // Try to resolve the value for the current context
        const onArray = Array.isArray(spec.on) ? spec.on : [spec.on];
        const key = onArray
          .map((attr) => `${attr}=${context[attr]}`)
          .sort()
          .join(" & ");
        const val =
          spec.cases[key] ??
          spec.cases[String(context[spec.on[0]])] ??
          spec.cases["default"];
        if (typeof val === "string") {
          // Handle faker method strings
          if (val.startsWith("faker.")) {
            return generateFallbackValue(val, "faker");
          } else {
            return val;
          }
        } else if (typeof val === "object" && val !== null) {
          // If it's a nested faker spec, fallback to a random int
          return faker.number.int({ min: 10, max: 1000 });
        } else {
          return val ?? 0;
        }
      // Other types will be implemented as needed
      default:
        return null;
    }
  }
}
