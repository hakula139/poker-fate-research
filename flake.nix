{
  description = "Poker Fate research workspace";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        formatter = pkgs.writeShellApplication {
          name = "poker-fate-research-fmt";
          runtimeInputs = with pkgs; [
            findutils
            nixfmt
            ruff
          ];
          text = ''
            find . -name '*.nix' -not -path './.git/*' -print0 | xargs -0 --no-run-if-empty nixfmt
            ruff format .
          '';
        };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
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
            nixfmt
            python3
            python3Packages.mypy
            python3Packages.pytest
            ripgrep
            ruff
            unzip
          ];

          shellHook = ''
            export PYTHONPATH="$PWD/src''${PYTHONPATH:+:$PYTHONPATH}"
          '';
        };

        inherit formatter;
      }
    );
}
