import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// Daftar kata kunci tanaman/komoditas yang dilarang ditanam & diperjualbelikan
export const FORBIDDEN_CROPS: string[] = [
  'ganja',
  'cannabis',
  'marijuana',
  'mariyuana',
  'gele',
  'cimeng',
  'opium',
  'papaver',
  'koka',
  'coca',
  'kokain',
  'katinona',
  'cathinone',
  'kratom',
  'kecubung',
  'magic mushroom',
  'psilocybin',
  'rafflesia',
  'bunga bangkai',
  'kantong semar',
];

@ValidatorConstraint({ name: 'isAllowedCrop', async: false })
export class IsAllowedCropConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;

    const normalizedInput = value.toLowerCase().trim();
    return !FORBIDDEN_CROPS.some((forbidden) =>
      normalizedInput.includes(forbidden.toLowerCase()),
    );
  }

  defaultMessage(args: ValidationArguments): string {
    return `Komoditas "${args.value}" termasuk dalam daftar tanaman yang dilarang untuk ditanam maupun diperjualbelikan.`;
  }
}

export function IsAllowedCrop(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAllowedCropConstraint,
    });
  };
}