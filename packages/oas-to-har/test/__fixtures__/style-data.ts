export const arrayInput = ['blue', 'black', 'brown'];
export const arrayInputEncoded = ['something&nothing=true', 'hash#data'];

export const emptyInput = '';

export const objectInput = { R: 100, G: 200, B: 150 };
export const objectInputEncoded = { pound: 'something&nothing=true', hash: 'hash#data' };

export const objectNestedObject = {
  id: 'someID',
  child: { name: 'childName', age: null, metadata: { name: 'meta' } },
};

export const objectNestedObjectOfARidiculiousShape = {
  id: 'someID',
  petLicense: null,
  dog: { name: 'buster', age: 18, treats: ['peanut butter', 'apple'] },
  pets: [
    {
      name: 'buster',
      age: null,
      metadata: { isOld: true },
    },
  ],
};

export const stringInput = 'blue';
export const stringInputEncoded = encodeURIComponent('something&nothing=true');

export const undefinedArrayInput = [undefined];
export const undefinedInput = undefined;
export const undefinedObjectInput = { R: undefined };
