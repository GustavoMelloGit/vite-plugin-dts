import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  hasExportDefault,
  normalizeGlob,
  removePureImport,
  transformAliasImport,
  transformDynamicImport
} from '../src/transform'

import type { Alias } from 'vite'

describe('transform tests', () => {
  it('test: normalizeGlob', () => {
    expect(normalizeGlob('')).toEqual('/**')
    expect(normalizeGlob('/')).toEqual('/**')
    expect(normalizeGlob('.')).toEqual('./**')
    expect(normalizeGlob('..')).toEqual('../**')
    expect(normalizeGlob('../..')).toEqual('../../**')
    expect(normalizeGlob('a/b')).toEqual('a/b/**')
    expect(normalizeGlob('a/b/')).toEqual('a/b/**')
    expect(normalizeGlob('a/.b')).toEqual('a/.b')
    expect(normalizeGlob('a/b.c')).toEqual('a/b.c')
    expect(normalizeGlob('**/*')).toEqual('**/*')
    expect(normalizeGlob('a/b*')).toEqual('a/b*/**')
    expect(normalizeGlob('a/*')).toEqual('a/*')
    expect(normalizeGlob('a/**')).toEqual('a/**')
  })

  it('test: transformDynamicImport', () => {
    expect(transformDynamicImport('data: import("vexip-ui/lib/tree").InitDataOptions[];')).toEqual(
      "import { InitDataOptions } from 'vexip-ui/lib/tree';\ndata: InitDataOptions[];"
    )

    expect(
      transformDynamicImport(
        'declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin>;\nexport default _default;\n'
      )
    ).toEqual(
      "import { DefineComponent, ComponentOptionsMixin } from 'vue';\ndeclare const _default: DefineComponent<{}, {}, {}, {}, {}, ComponentOptionsMixin>;\nexport default _default;\n"
    )

    expect(
      transformDynamicImport('}> & {} & {} & import("vue").ComponentCustomProperties) | null>;')
    ).toEqual(
      "import { ComponentCustomProperties } from 'vue';\n}> & {} & {} & ComponentCustomProperties) | null>;"
    )

    expect(
      transformDynamicImport(
        'declare const _default: import("./Service").ServiceConstructor<import("./Service").default>;'
      )
    ).toEqual(
      "import { ServiceConstructor, default as __DTS_1__ } from './Service';\ndeclare const _default: ServiceConstructor<__DTS_1__>;"
    )

    expect(
      transformDynamicImport('import { Type } from "./test";\nconst test: import("./test").Test;')
    ).toEqual("import { Test, Type } from './test';\nconst test: Test;")
  })

  it('test: transformAliasImport', () => {
    const aliases: Alias[] = [
      { find: /^@\/(.+)/, replacement: resolve(__dirname, '../$1') },
      { find: /^@components\/(.+)/, replacement: resolve(__dirname, '../src/components/$1') },
      { find: /^~\//, replacement: resolve(__dirname, '../src/') },
      { find: '$src', replacement: resolve(__dirname, '../src') }
    ]
    const filePath = resolve(__dirname, '../src/index.ts')

    expect(
      transformAliasImport(filePath, 'import type { TestBase } from "@/src/test";\n', aliases)
    ).toEqual("import type { TestBase } from './test';\n")

    expect(transformAliasImport(filePath, 'import("@/components/test").Test;\n', aliases)).toEqual(
      "import('../components/test').Test;\n"
    )
    expect(
      transformAliasImport(
        filePath,
        'import type { TestBase } from "@/components/test";\n',
        aliases
      )
    ).toEqual("import type { TestBase } from '../components/test';\n")

    expect(transformAliasImport(filePath, 'import("@/components/test").Test;\n', aliases)).toEqual(
      "import('../components/test').Test;\n"
    )

    expect(
      transformAliasImport(
        filePath,
        'import VContainer from "@components/layout/container/VContainer.vue";\n',
        aliases
      )
    ).toEqual("import VContainer from './components/layout/container/VContainer.vue';\n")

    expect(
      transformAliasImport(filePath, 'import type { TestBase } from "~/test";\n', aliases)
    ).toEqual("import type { TestBase } from './test';\n")

    expect(
      transformAliasImport(filePath, 'import type { TestBase } from "$src/test"', aliases)
    ).toEqual("import type { TestBase } from './test'")
  })

  it('test: removePureImport', () => {
    expect(removePureImport('import "@/themes/common.scss";')).toEqual('')
    expect(
      removePureImport('import "@/themes/common.scss";\nimport type { Ref } from "vue";')
    ).toEqual('import type { Ref } from "vue";')
  })

  it('test: hasExportDefault', () => {
    expect(hasExportDefault("export { sdk as default } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { foo, sdk as default } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { sdk as default, baz } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { foo, sdk as default, baz } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { foo as sdk, sdk as default, baz } from './sdk'")).toBe(true)
    expect(hasExportDefault('export { sdk as default } from "./sdk"')).toBe(true)
    expect(hasExportDefault("export {sdk as default} from './sdk'")).toBe(true)
    expect(hasExportDefault("export{sdk as default}from'./sdk'")).toBe(true)
    expect(hasExportDefault("export { sdk  as  default } from './sdk'")).toBe(true)
    expect(hasExportDefault("export { sdk } from './sdk'")).toBe(false)
    expect(hasExportDefault("export { foo, sdk } from './sdk'")).toBe(false)
    expect(hasExportDefault("export { foo as baz, sdk } from './sdk'")).toBe(false)
    expect(hasExportDefault("export { as default } from './sdk'")).toBe(false)
    expect(hasExportDefault("export { sdkas default } from './sdk'")).toBe(false)
  })
})
