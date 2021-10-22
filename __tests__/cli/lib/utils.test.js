const utils = require('../../../src/cli/lib/utils');

describe('CLI utils', function () {
  it.todo('#findSwagger');

  describe('#isJSONOrYaml', function () {
    it('should recognize `.json` as JSON', () => {
      expect(utils.isJSONOrYaml(require.resolve('@readme/oas-examples/3.0/json/petstore.json'))).toBe(true);
    });

    it('should recognize `.yaml` as YAML', () => {
      expect(utils.isJSONOrYaml(require.resolve('@readme/oas-examples/3.0/yaml/petstore.yaml'))).toBe(true);
    });

    it('should recognize `.yml` as YAML', () => {
      expect(utils.isJSONOrYaml(require.resolve('@readme/oas-examples/3.0/yaml/petstore.yaml'))).toBe(true);
    });

    it('should not recognize `.js` as JSON', () => {
      expect(utils.isJSONOrYaml('i-am-not-json.js')).toBe(false);
    });

    it('should not recognize `.y` as YAML', () => {
      expect(utils.isJSONOrYaml('i-am-not-yaml.y')).toBe(false);
    });
  });

  it.todo('#fileExists');

  it.todo('#guessLanguage');

  describe('#swaggerInlineExample', () => {
    it.each([['coffee'], ['go'], ['java'], ['js'], ['jsx'], ['php'], ['py'], ['rb'], ['ts']])(
      'should support `.%s`',
      lang => {
        expect(utils.swaggerInlineExample(lang)).toMatchSnapshot();
      }
    );
  });
});
