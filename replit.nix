{pkgs}: {
  deps = [
    pkgs.bash
    pkgs.rustc
    pkgs.libiconv
    pkgs.cargo
    pkgs.ffmpeg-full
    pkgs.libxcrypt
    pkgs.ffmpeg
    pkgs.postgresql
    pkgs.jq
  ];
}
