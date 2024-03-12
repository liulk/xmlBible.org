# xmlBible.org 
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M4M83FULE)

The purpose of xmlBible.org is to provide an exhaustive xml coded version of the Bible. I will start with the KJV (Oxford) and provide coding to show information about the various levels. 


### Below is an sample of how the finished product will (hopefully) eventually look

```xml

<?xml version="1.0" encoding="UTF-8"?>
<translation version="KJV" variant="Oxford">
  <!-- This will be the Oxford variant of the King James version of the Bible -->
  <testament type="Old">
    <book name="Genesis">
      <chapter num="1">
        <paragraph note="God creates heaven and earth">
        <!-- Most paragraphs have notes that can be used for outlines or headers -->
          <verse num="1">
            <phrase strongs="H7225">
            <!-- The phrases are the grouping of word linked to a single Strong's Lexicon defiction -->
              <word>
                In
              </word>
              <word>
                The
              </word>
              <word xref="Jn 1:1,3;Heb 1:10">
              <!-- I will include the Holman crossreferences. -->
                Beginning
              </word>
            </phrase>
            <phrase strongs="H430">
              <word xref="Job 38:4;Isa 44:24;Rom 1:20;Col 1:16;Heb 11:3;Rev 4:11">
                God
              </word>
            </phrase>
            <phrase strongs="H1254">
              <word>
                created
              </word>
            </phrase>
            <phrase strongs="H853" type="not translated">
            <!-- Orignal language words that are not translated will be noted with an empty phrase -->
            </phrase>
            <phrase strongs="H064">
              <word>
                the
              </word>
              <word modern="heavens">
              <!-- modern versions of the words will be included -->
                heaven
              </word>
            </phrase>
          </verse>
        </paragraph>
      </chapter>
    </book>
    <book name="Joshua">
      <chapter num="13">
        <paragraph note="The bounds of the inheritance of Reuben">
          <verse num="18">
            <phrase strongs="H3096">
              <word cambridge="Jahazah">
              <!-- I will also include the Cambridge varients -->
                Jahaza
              </word>
            </phrase>
          </verse>
        </paragraph>
      </chapter>
    </book>
  </testament>
  <testament type="New">
    <book name="Matthew">
      <chapter num="1">
        <paragraph note="and declares the names and office of Jesus">
          <verse num="21">
            <phrase strongs="G2564">
            <!-- this is a better example of the modern words being offered -->
              <word modern="you">
                thou
              </word>
              <word modern="shall">
                shalt
              </word>
              <word>
                call
              </word>
            </phrase>
          </verse>
        </paragraph>
      </chapter>
    </book>
  </testament>
</translation>
```

### Proposed Timeline

- Gathering data
  + xrefs, red letters, words variants
- Compile XML
