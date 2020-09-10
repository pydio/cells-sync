# Changes between v0.9.1 and v0.9.2

[See Full Changelog](https://github.com/pydio/cells-sync/compare/v0.9.1...v0.9.2)

- [#28c8045](https://github.com/pydio/cells-sync/commit/28c80455053ca7d40d1770a044d4d584c3fbd766): Fix patch.Error display
- [#18bd6be](https://github.com/pydio/cells-sync/commit/18bd6beef0ef0564a98510aedf90f159a2ad6751): Ensure no cache for IE
- [#aaea117](https://github.com/pydio/cells-sync/commit/aaea117ff5d39578116aa1e9542d60f8bfa99603): FR & DE translation of the new messages
- [#d15574a](https://github.com/pydio/cells-sync/commit/d15574aebcc1b16f345057f47750edf43be66c8a): FR & DE translation of the new messages
- [#f1ce291](https://github.com/pydio/cells-sync/commit/f1ce291323f54bcdfbabd5d7872695977552c430): Fix string typo
- [#31](https://github.com/pydio/cells-sync/pull/31): New french translation
- [#3953b20](https://github.com/pydio/cells-sync/commit/3953b203f110bd0e61c30921e2a86aa7d809b5be): New french translation
- [#80f5a1c](https://github.com/pydio/cells-sync/commit/80f5a1c46ce387164427f2360f32b8a08ecc6257): Disable listPatch cache in IE
- [#f37ce84](https://github.com/pydio/cells-sync/commit/f37ce84049f6034bbdc86c83f091634ffd701dba): Improve patch logs
- [#0948b36](https://github.com/pydio/cells-sync/commit/0948b3692019c70451fa214bf40087c292d36c52): Store patch.Source to fix direction
- [#740e550](https://github.com/pydio/cells-sync/commit/740e550d089e4c2deb4ab5188ba785f4947cc69b): i18n about page
- [#83c2e19](https://github.com/pydio/cells-sync/commit/83c2e19450c64ded867ee353714397a400531f32): Send empty STATE message when no task is configured
- [#bded846](https://github.com/pydio/cells-sync/commit/bded84672ecb9f456cace44b101380da25c76f9a): Refactor interface, handle socket first load, new default screen for all recent activities
- [#3286357](https://github.com/pydio/cells-sync/commit/3286357d38bf106a43671d80946ea7cffc3e6450): New first page LastActivities
- [#11e0fda](https://github.com/pydio/cells-sync/commit/11e0fda4bca289c725fdd60ae35f093c6e5b23eb): Better handling of patch global error (persisted in patch store). Sync "paused" state persisted on restart. Disable pause/start when task is not listening to global events.
- [#5f2f61f](https://github.com/pydio/cells-sync/commit/5f2f61f6bee4ee23c4f10aa8c5b1ee37a8dde17e): switch webview to fork to help with clean build
- [#7babe5c](https://github.com/pydio/cells-sync/commit/7babe5c2c81493cd50871975c8518e38f7a828c0): Excluse sigusr1 from
- [#0651105](https://github.com/pydio/cells-sync/commit/0651105ad4c70e057fd063045578948ed03d9c45): Remove sigusr1 on windows
- [#382c2bf](https://github.com/pydio/cells-sync/commit/382c2bfc7e3b4db011b52dbb17146c03723b8b70): Add support for sigusr1 signal Manually encore TreeResponse (fixing jsonpb incompatibility issue)
- [#d80cb6e](https://github.com/pydio/cells-sync/commit/d80cb6ef19df77fd08cbfe7d5460d961ef619453): Accounts : display connection state (send refreshStatus token info)
- [#ff5cac2](https://github.com/pydio/cells-sync/commit/ff5cac238147fbc903186ed009b9963e79c126c4): Tray: ignore first deconnection event
- [#822d0a8](https://github.com/pydio/cells-sync/commit/822d0a87bdccc814064520e1e4330740665762ec): Add a link to our documentation page
- [#f08ddef](https://github.com/pydio/cells-sync/commit/f08ddef4a22a98a51cd3f76e4dd1a2cf53ccaf6e): A few more hints
- [#c30859c](https://github.com/pydio/cells-sync/commit/c30859c79de43efea176877c3be1fd347e44f206): Fix windows UX glitches - close #17 Fix selective sync with empty folder - close #22 npm update
- [#25741e6](https://github.com/pydio/cells-sync/commit/25741e6aae49a2392886ef08bc0e43fc0e4986a5): Re-adapt to cells master : call log.Init() in root command
- [#9a0eee2](https://github.com/pydio/cells-sync/commit/9a0eee2b19a08dcbe3521040448c4f0a456260ac): Add Latvian translation thanks to @kristapskr
- [#8a02916](https://github.com/pydio/cells-sync/commit/8a02916cea841613d5edab6792ee12b9bb5ed922): Add Latvian translation
- [#cf1c5e0](https://github.com/pydio/cells-sync/commit/cf1c5e0519f1d509fbc755264a2b8747ff9276ec): Fixing test
- [#88bd035](https://github.com/pydio/cells-sync/commit/88bd035969fb272719d4dc75f3bba0b597f191f2): Running cells sync tests
- [#a7829a6](https://github.com/pydio/cells-sync/commit/a7829a6d888da7ffab9a94083807b8cdff1e544e): Enable Spanish
- [#c0f9b00](https://github.com/pydio/cells-sync/commit/c0f9b0041cfc1eaabe2f7b12ebacd1286f68bd1b): Switch systray to a forked version to fix xgo builds issues
- [#b285b95](https://github.com/pydio/cells-sync/commit/b285b95ceb5ada17d4f99021eca429a388fd3f82): Add Spanish language + a few fixes on the German translation
- [#1d5ab6a](https://github.com/pydio/cells-sync/commit/1d5ab6a5f58512b661b766411abc69b256f07f0c): Add Spanish language + a few fixes on the German translation
- [#233481a](https://github.com/pydio/cells-sync/commit/233481aad88c35f28316100e214c5d8077b2ab2d): Make XGo image used for builds configurable
- [#a83a9a5](https://github.com/pydio/cells-sync/commit/a83a9a59c63b04414a8968d708f7ac2e34c8eba5): TreeDialog: fix error message going through translation
- [#a68cbfa](https://github.com/pydio/cells-sync/commit/a68cbfa66260d5b754825c3270f2ae89e0713122): HttpHandler: extract error stack to json
