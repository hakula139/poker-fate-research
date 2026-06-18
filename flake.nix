{
  description = "Poker Fate research workspace";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    flake-utils.url = "github:numtide/flake-utils";
    git-hooks-nix = {
      url = "github:cachix/git-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      git-hooks-nix,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        pythonCheckEnv = pkgs.python3.withPackages (pythonPackages: [
          pythonPackages.mypy
          pythonPackages.pytest
        ]);

        preCommitCheck = git-hooks-nix.lib.${system}.run {
          src = ./.;
          hooks = {
            check-added-large-files.enable = true;
            check-python.enable = true;
            cspell = {
              enable = true;
              args = [
                "--no-progress"
                "--no-must-find-files"
              ];
            };
            deadnix.enable = true;
            end-of-file-fixer.enable = true;
            markdownlint-cli2 = {
              enable = true;
              entry = "${pkgs.markdownlint-cli2}/bin/markdownlint-cli2 --fix";
              files = "\\.md$";
            };
            nixfmt.enable = true;
            ruff.enable = true;
            ruff-format.enable = true;
            statix.enable = true;
            trim-trailing-whitespace = {
              enable = true;
              args = [ "--markdown-linebreak-ext=md" ];
            };
          };
        };
      in
      {
        checks = {
          pre-commit = preCommitCheck;
          python-tests = pkgs.runCommand "python-tests" { nativeBuildInputs = [ pythonCheckEnv ]; } ''
            cd ${./.}/python
            pytest -q -o cache_dir="$TMPDIR/pytest-cache"
            touch "$out"
          '';
          python-types = pkgs.runCommand "python-types" { nativeBuildInputs = [ pythonCheckEnv ]; } ''
            cd ${./.}/python
            export MYPY_CACHE_DIR="$TMPDIR/mypy-cache"
            mypy src tests
            touch "$out"
          '';
        };

        devShells.default = pkgs.mkShell {
          packages =
            preCommitCheck.enabledPackages
            ++ (with pkgs; [
              aapt
              apktool
              binutils
              cspell
              curl
              file
              git
              jadx
              jq
              markdownlint-cli2
              mypy
              nodejs
              pnpm
              playwright-driver
              nixfmt
              python3
              ripgrep
              ruff
              unzip
              uv
              zsh
            ]);

          inherit (preCommitCheck) shellHook;
          PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
        };

        formatter = pkgs.nixfmt;
      }
    );
}
