// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  splitByOutline,
  splitChapters,
} from "../../scripts/lib/detect-chapters";

describe("splitChapters", () => {
  it("drops front matter and splits on CHAPTER headings plus the following title", () => {
    const chapters = splitChapters([
      { page: 1, text: "The Lantern Academy\nCopyright 1999" },
      {
        page: 2,
        text: "CHAPTER ONE\nTHE MOONSTONE KEY\nProfessor Rowan hides the key.",
      },
      { page: 3, text: "Mira waits by the eastern observatory." },
      {
        page: 4,
        text: "CHAPTER TWO\nSTARLIGHT\nThe archive opens at dusk.",
      },
    ]);

    expect(chapters).toEqual([
      {
        index: 1,
        title: "The Moonstone Key",
        startPage: 2,
        endPage: 3,
        content:
          "Professor Rowan hides the key.\n\nMira waits by the eastern observatory.",
      },
      {
        index: 2,
        title: "Starlight",
        startPage: 4,
        endPage: 4,
        content: "The archive opens at dusk.",
      },
    ]);
  });

  it("treats an epilogue heading as the final chapter", () => {
    const chapters = splitChapters([
      {
        page: 1,
        text: "CHAPTER ONE\nTHE KEY\nThe bell rings.",
      },
      {
        page: 2,
        text: "EPILOGUE\nNINETEEN YEARS LATER\nThe observatory is quiet.",
      },
    ]);

    expect(chapters.map((chapter) => chapter.title)).toEqual([
      "The Key",
      "Nineteen Years Later",
    ]);
    expect(chapters[1]?.index).toBe(2);
  });

  it("accepts numeric chapter headings on one line", () => {
    const chapters = splitChapters([
      {
        page: 8,
        text: "Chapter 3: The Winter Bell\nSnow covers the courtyard.",
      },
    ]);

    expect(chapters).toEqual([
      {
        index: 3,
        title: "The Winter Bell",
        startPage: 8,
        endPage: 8,
        content: "Snow covers the courtyard.",
      },
    ]);
  });

  it("ignores repeating CHAPTER running headers after a chapter has started", () => {
    const chapters = splitChapters([
      {
        page: 1,
        text: "CHAPTER ONE\nTHE KEY\nThe bell rings.",
      },
      {
        page: 2,
        text: "CHAPTER ONE\nMira waits outside.",
      },
      {
        page: 3,
        text: "CHAPTER TWO\nSTARLIGHT\nThe archive opens.",
      },
    ]);

    expect(chapters.map((chapter) => chapter.title)).toEqual([
      "The Key",
      "Starlight",
    ]);
    expect(chapters[0]?.content).toBe("The bell rings.\n\nMira waits outside.");
    expect(chapters[0]?.endPage).toBe(2);
  });

  it("accepts glued CHAPTERONE headings and skips ornamental page numbers", () => {
    const chapters = splitChapters([
      {
        page: 13,
        text: "CHAPTERONE\n‘ 1 ‘\nTHE MOONSTONE KEY\nThe lantern keeps its key.",
      },
    ]);

    expect(chapters).toEqual([
      {
        index: 1,
        title: "The Moonstone Key",
        startPage: 13,
        endPage: 13,
        content: "The lantern keeps its key.",
      },
    ]);
  });

  it("joins a wrapped all-caps chapter title", () => {
    const chapters = splitChapters([
      {
        page: 100,
        text: "CHAPTER SIX\nTHE JOURNEY FROM\nPLATFORM NINE\nThey boarded at dawn.",
      },
    ]);

    expect(chapters[0]?.title).toBe("The Journey From Platform Nine");
    expect(chapters[0]?.content).toBe("They boarded at dawn.");
  });

  it("reads a chapter number on the line after CHAPTER", () => {
    const chapters = splitChapters([
      {
        page: 1,
        text: "CHAPTER\nONE\nTHE KEY\nThe bell rings.",
      },
    ]);

    expect(chapters).toEqual([
      {
        index: 1,
        title: "The Key",
        startPage: 1,
        endPage: 1,
        content: "The bell rings.",
      },
    ]);
  });

  it("strips repeating chapter titles from later pages", () => {
    const chapters = splitChapters([
      {
        page: 1,
        text: "CHAPTER ONE\nTHE KEY\nThe bell rings in the hall.",
      },
      {
        page: 2,
        text: "THE KEY\nMira waits outside the archive.",
      },
    ]);

    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.content).toBe(
      "The bell rings in the hall.\n\nMira waits outside the archive.",
    );
  });

  it("throws when no chapter heading is found", () => {
    expect(() =>
      splitChapters([{ page: 1, text: "Just a stray page of prose." }]),
    ).toThrow(/no chapter/i);
  });
});

describe("splitByOutline", () => {
  it("cuts chapters at outline page ranges and drops earlier front matter", () => {
    const chapters = splitByOutline(
      [
        { page: 1, text: "Copyright notice." },
        { page: 8, text: "OWL POST\nOwls arrive before breakfast." },
        { page: 9, text: "The parcel is heavy." },
        { page: 20, text: "AUNT MARGE’S BIG MISTAKE\nThe lamp explodes." },
      ],
      [
        { title: "OWL POST", startPage: 8 },
        { title: "AUNT MARGE’S BIG MISTAKE", startPage: 20 },
      ],
    );

    expect(chapters).toEqual([
      {
        index: 1,
        title: "Owl Post",
        startPage: 8,
        endPage: 9,
        content: "Owls arrive before breakfast.\n\nThe parcel is heavy.",
      },
      {
        index: 2,
        title: "Aunt Marge’s Big Mistake",
        startPage: 20,
        endPage: 20,
        content: "The lamp explodes.",
      },
    ]);
  });
});
