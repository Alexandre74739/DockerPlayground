import { describe, expect, it } from "vitest";
import { matchCommand, tokenize } from "./command-parser";
import type { CommandRule } from "./types";

const runWeb: CommandRule = {
  prefixes: [
    ["docker", "run"],
    ["docker", "container", "run"],
  ],
  flags: [{ names: ["-d", "--detach"] }, { names: ["-p", "--publish"], value: "8080:80" }, { names: ["--name"], value: "web" }],
  args: ["nginx"],
};

describe("tokenize", () => {
  it("respecte les guillemets", () => {
    expect(tokenize(`docker run -e "A=b c" img`)).toEqual(["docker", "run", "-e", "A=b c", "img"]);
  });
});

describe("matchCommand", () => {
  it("accepte les options dans n'importe quel ordre", () => {
    expect(matchCommand("docker run --name web -p 8080:80 -d nginx", runWeb).ok).toBe(true);
  });

  it("accepte les alias et la syntaxe --option=valeur", () => {
    expect(matchCommand("docker container run --detach --publish=8080:80 --name=web nginx", runWeb).ok).toBe(true);
  });

  it("développe les options courtes groupées", () => {
    const rule: CommandRule = {
      prefixes: [["docker", "run"]],
      flags: [{ names: ["-i"] }, { names: ["-t"] }],
      args: ["ubuntu"],
    };
    expect(matchCommand("docker run -it ubuntu", rule).ok).toBe(true);
  });

  it("refuse une option manquante ou une mauvaise valeur", () => {
    expect(matchCommand("docker run -d --name web nginx", runWeb)).toMatchObject({ ok: false });
    expect(matchCommand("docker run -d -p 3000:80 --name web nginx", runWeb)).toMatchObject({ ok: false });
  });

  it("refuse une mauvaise commande ou un mauvais argument", () => {
    expect(matchCommand("docker start web", runWeb).ok).toBe(false);
    expect(matchCommand("docker run -d -p 8080:80 --name web httpd", runWeb).ok).toBe(false);
  });

  it("vérifie l'ordre des arguments", () => {
    const rule: CommandRule = { prefixes: [["docker", "tag"]], args: ["nginx", "mon-nginx:v1"] };
    expect(matchCommand("docker tag nginx mon-nginx:v1", rule).ok).toBe(true);
    expect(matchCommand("docker tag mon-nginx:v1 nginx", rule).ok).toBe(false);
  });
});
