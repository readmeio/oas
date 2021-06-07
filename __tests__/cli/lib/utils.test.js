const path = require('path');
const utils = require('../../../src/cli/lib/utils');

describe('CLI utils', function () {
  it.todo('#findSwagger');

  describe('#isJSONOrYaml', function () {
    it('yaml file is swagger', function () {
      expect(utils.isJSONOrYaml(path.join(__dirname, '../__fixtures__/yaml/PetStore.yaml'))).toBe(true);
    });

    it('json file is swagger', function () {
      expect(utils.isJSONOrYaml(path.join(__dirname, '../__fixtures__/json/swagger.json'))).toBe(true);
    });

    it('bad json file is not swagger', function () {
      expect(utils.isJSONOrYaml(path.join(__dirname, '../_fixtures__/yaml/notthefile.js'))).toBe(false);
    });

    it('bad yaml file is not swagger', function () {
      expect(utils.isJSONOrYaml(path.join(__dirname, '../__fixtures__/json/wrongfile.y'))).toBe(false);
    });
  });

  it.todo('#fileExists');

  it.todo('#guessLanguage');

  // @fixme Snapshot is different in CI for some reason. Should look into this at some point.
  describe.skip('#swaggerInlineExample', () => {
    it.each([['coffee'], ['go'], ['java'], ['js'], ['jsx'], ['php'], ['py'], ['rb'], ['ts']])(
      'should support `.%s`',
      lang => {
        expect(utils.swaggerInlineExample(lang)).toMatchSnapshot();
      }
    );
  });
});
