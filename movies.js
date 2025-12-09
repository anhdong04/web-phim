// movies.js
const movieList = [
    {
    "id": 1478821,
    "title": "Mang Mẹ Đi Bỏ",
    "original_title": "Mang Mẹ Đi Bỏ",
    "overview": "Rời Xa Mẹ kể về câu chuyện của Hoan (Tuấn Trần), một chàng trai trẻ kiếm sống bằng nghề cắt tóc 'gã hề đường phố' để chăm sóc mẹ. Mẹ anh, Lê Thị Hạnh (Hồng Đào), mắc bệnh Alzheimer và cư xử như một đứa trẻ. Căn bệnh của bà không chỉ là gánh nặng tài chính mà còn tước đi cuộc sống tự do và những ước mơ mà anh vẫn đang theo đuổi. Một ngày nọ, Hoan đưa ra một quyết định định mệnh - 'gửi mẹ' cho anh trai mình ở Hàn Quốc, một người mà anh thậm chí chưa từng gặp mặt.",
    "poster_path": "https://image.tmdb.org/t/p/w500/ene2eO4C7We80YIcu7yX9zVGsSS.jpg",
    "release_date": "2025-07-30",
    "vote_average": 8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/z4y1rojm0zztpvswfw8wd/Leaving-Mom.2025.1080p.WEB-DL.H264.AAC.mp4?rlkey=6gi8u981a64eq8eypyg5fvs2b&st=j7due4jf&dl=1&dl=1"
    },
    {
        "id": 1010756,
        "title": "Sát Nhân Giấu Mặt: Chương 2",
        "original_title": "The Strangers: Chapter 2",
        "overview": "Sau những sự kiện kinh hoàng ở phần trước, Maya bị mắc kẹt tại một thị trấn nhỏ không lối thoát. Khi màn đêm buông xuống, ba kẻ sát nhân đeo mặt nạ lại xuất hiện, biến nơi đây thành địa ngục trần gian. Maya không chỉ phải chạy trốn mà còn phải đối mặt với quá khứ và nỗi sợ hãi sâu thẳm nhất của mình.",
        "poster_path": "https://image.tmdb.org/t/p/w500/aEk9jLbiKTVssdATbrF879NvyyJ.jpg",
        "release_date": "2025-09-25",
        "vote_average": 6.11,
        // Đã sửa link dưới (xóa &dl=0 thừa)
        "dropbox_link": "https://www.dropbox.com/scl/fi/mjw76u8iknlaviooh7t61/The.Strangers.Chapter.2.2025.Hybrid.1080p.BluRay.x264-BRUTE.mkv?rlkey=o7lbomu84wex3zmmtkpoulisi&st=jqhmtvsd&dl=1"
    },
    {
    "id": 1390401,
    "title": "Vyšehrad Dvje",
    "original_title": "Vyšehrad Dvje",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/hb4prLWVThOJ4BgFacO5NqgYOcy.jpg",
    "release_date": "2025-04-17",
    "vote_average": 5.6,
    "dropbox_link": "https://www.dropbox.com/scl/fi/gnlxb6w1ycm4j5dkha2xi/Vysehrad-Dvje.2025.1080p.Blu-ray.Remux.AVC.DTS-HD.MA.5.1-MBH.mkv?rlkey=499nwmgbtlbh74pmesaoj59yo&st=4edqjhe8&dl=0&dl=1"
    },

    {
    "id": 1574042,
    "title": "Predator: Wastelands",
    "original_title": "Predator: Wastelands",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/bQ0neJZ5QAD6jRHIbbdx2rtMBUb.jpg",
    "release_date": "2025-11-04",
    "vote_average": 5.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/6rh7n133ab0wys7huk1jj/Predator.Wastelands.2025.1080p.AMZN.WEB-DL.DDP5.1.H.264-WADU.mkv?rlkey=wc2tpyghchuyztgxldylzdzk5&st=heorsg25&dl=0&dl=1"
    },

    {
    "id": 1241470,
    "title": "Cuộc Chiến Ngoài Hành Tinh",
    "original_title": "Osiris",
    "overview": "Một nhóm lính đặc nhiệm bị bắt cóc bởi một tàu vũ trụ bí ẩn trong lúc làm nhiệm vụ. Khi tỉnh lại, họ phải chiến đấu để sinh tồn trước một chủng tộc ngoài hành tinh hung hãn.",
    "poster_path": "https://image.tmdb.org/t/p/w500/3YtZHtXPNG5AleisgEatEfZOT2w.jpg",
    "release_date": "2025-07-25",
    "vote_average": 6.303,
    "dropbox_link": "https://www.dropbox.com/scl/fi/2c93rfp0pj10ewdz6xsc4/Osiris.2025.ViE.1080p.BluRay.x264-VETO.mkv?rlkey=0nra9arbtbu5z3apxi1amo32x&st=wwkd0j5q&dl=0&dl=1"
    },
    {
    "id": 1131759,
    "title": "Toàn Trí Độc Giả",
    "original_title": "전지적 독자 시점",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/6BTk9XiV6kVOzO5RSFRE2jEy0Yz.jpg",
    "release_date": "2025-07-23",
    "vote_average": 6.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/sdtysoqu94k66xwb61i7u/Omniscient.Reader.The.Prophecy.2025-1080p.BluRay.TrueHD.Atmos.7.1-x264-WATCHABLE.mkv?rlkey=z3wwcdcq49mju7ko2wrn4mrd0&st=ipm29c15&dl=0&dl=1"
    },

    {
    "id": 1386792,
    "title": "Lefter: Câu chuyện của Ordinarius",
    "original_title": "Lefter: Bir Ordinaryüs Hikayesi",
    "overview": "Một thần đồng bóng đá vươn lên thành danh, chiến đấu với định kiến và những giằng xé nội tâm để chạm tới sự vĩ đại. Phim dựa trên cuộc đời của Lefter, huyền thoại của Thổ Nhĩ Kỳ.",
    "poster_path": "https://image.tmdb.org/t/p/w500/pvy0dINISg6SIlRpzALX0p284lm.jpg",
    "release_date": "2025-11-13",
    "vote_average": 6.538,
    "dropbox_link": "https://www.dropbox.com/scl/fi/qu9fcs806isf018zaglzg/Lefter.The.Story.of.the.Ordinarius.2025.1080p.NF.WEB-DL.DDP5.1.Atmos.H264-HHWEB-Sub-Viet.mkv?rlkey=7306m0qptvb0yqkvmqsssz5hz&st=7tacoodk&dl=0&dl=1"
},
{
    "id": 1069905,
    "title": "Jay Kelly",
    "original_title": "Jay Kelly",
    "overview": "Trong bộ phim đến từ ứng viên giải Oscar Noah Baumbach, ngôi sao điện ảnh Jay Kelly đối mặt với quá khứ và hiện tại trên hành trình đi khắp châu Âu cùng người quản lý tận tụy.",
    "poster_path": "https://image.tmdb.org/t/p/w500/bKLm1xS9DsODWB4i1SxTEvLXab9.jpg",
    "release_date": "2025-11-14",
    "vote_average": 5.833,
    "dropbox_link": "https://www.dropbox.com/scl/fi/elucle62tz4cbsz8qk7en/Jay.Kelly.2025.1080p.NF.WEB-DL.DDP5.1.Atmos.H.264-playWEB.mkv?rlkey=8lprdjbj7lknh4iq10zxfkdkg&st=r9v5e0t8&dl=0&dl=1"
},
{
    "id": 17979,
    "title": "Giáng Sinh Yêu Thương",
    "original_title": "A Christmas Carol",
    "overview": "Giáng Sinh Yêu Thương dựa trên tác phẩm văn học kinh điển cùng tên của đại văn hào Charles Dicken kể về lão già keo kiệt Miser Ebenezer Scrooge bị đánh thức trong Lễ Giáng Sinh bởi một hồn ma. Trong phim hay này, hồn ma đã cho lão thấy cuộc sống của lão khốn khổ chừng nào và một tương lai kinh khủng đang chờ lão. Lão nhận ra rằng cuộc sống của lão đã trở nên đắng cay và ích kỷ từng ngày, và lão phải lựa chọn.",
    "poster_path": "https://image.tmdb.org/t/p/w500/cRipc1dxyMoNlT1z8Pooq0oSllm.jpg",
    "release_date": "2009-11-04",
    "vote_average": 6.9,
    "dropbox_link": "https://www.dropbox.com/scl/fi/abcasrzhy2hm07xmmnga6/A.Christmas.Carol.2009.1080p.BluRay.x264-EbP-TM-Khukhooo-HDVNBits.mkv?rlkey=98zohmip8x9wah0g1yznln6ho&st=0h11wi3s&dl=0&dl=1"
},
{
    "id": 1327862,
    "title": "Cuộc Tình Vụng Trộm",
    "original_title": "Regretting You",
    "overview": "Jonah và Chris là hai người bạn thân. Jenny và Morgan là hai chị em ruột. Nếu Chris và Jenny luôn ồn ào nhiệt huyết thì Jonah và Morgan lại sâu lắng và kiệm lời. Sau buổi dạ hội cuối cấp, Morgan thông báo mình có thai với Chris. Và cũng vào ngày hôm ấy, Jonal nói lời chia tay Jenny và rời đi.",
    "poster_path": "https://image.tmdb.org/t/p/w500/z4gVnxTaks3anTycwKjDmvQSuWt.jpg",
    "release_date": "2025-10-22",
    "vote_average": 7.035,
    "dropbox_link": "https://www.dropbox.com/scl/fi/rebow66b1c9dje1k2b7mo/Regretting.You.2025.1080p.AMZN.WEB-DL.DDP5.1.Atmos.H.264-Kitsune.mkv?rlkey=qsp5nffav6pobufiukrm31s5l&st=01z47d0w&dl=0&dl=1"
},

{
    "id": 1434581,
    "title": "Rego Nyowo",
    "original_title": "Rego Nyowo",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/vzVESoM1YcGq2KltTLyIpG53fTW.jpg",
    "release_date": "2025-07-31",
    "vote_average": 3.667,
    "dropbox_link": "https://www.dropbox.com/scl/fi/8r7trwddgr6vzcanteios/Rego.Nyowo.2025.1080p.NF.WEB-DL.DD5.1.H.264-playWEB.mkv?rlkey=givlet2cqxserzsjrt0l63ays&st=bzvf7qb9&dl=0&dl=1"
},

{
    "id": 584242,
    "title": "热带雨",
    "original_title": "热带雨",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/3y3ayXbsoHGtxGBKb3oRLUHQ9ft.jpg",
    "release_date": "2019-11-22",
    "vote_average": 6.392,
    "dropbox_link": "https://www.dropbox.com/scl/fi/tu76towfwma9twgnmfrkc/Wet-Season-2019-Remux-BluRay-1080p-TrueHD-51x26510bit-MoiTinhCoTro.mkv?rlkey=4uzuy38nk5ca0661gfaarqy46&st=156rqp5p&dl=0&dl=1"
},
{
    "id": 1441563,
    "title": "Ông già Noel bí mật của tôi",
    "original_title": "My Secret Santa",
    "overview": "Một người mẹ đơn thân cần việc làm. Một khu nghỉ dưỡng trượt tuyết cần ông già Noel. Cải trang giống hệt Santa, liệu Taylor có lừa được vị thừa kế khách sạn quyến rũ thuê mình?",
    "poster_path": "https://image.tmdb.org/t/p/w500/tpOAzBasKPsKwsUtPZOx1Mzuqq3.jpg",
    "release_date": "2025-12-02",
    "vote_average": 6.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/powyr6cavgscbm6gmcskp/My.Secret.Santa.2025.1080p.NF.WEB-DL.DDP5.1.Atmos.H264-PandaQT.mkv?rlkey=t3rzdketajwcwuo78md6e9soq&st=vv5feylc&dl=0&dl=1"
},
{
    "id": 1323049,
    "title": "Bone Face",
    "original_title": "Bone Face",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/xky2SGq9Oz4pdD1J9T3yt3deU9U.jpg",
    "release_date": "2025-01-21",
    "vote_average": 3.7,
    "dropbox_link": "https://www.dropbox.com/scl/fi/gknutvl4eq9gxk21e7w2w/Bone.Face.2025.1080p.AMZN.WEB-DL.DD5.1.H.264-playWEB.mkv?rlkey=ha1ug73hzk3rw1q8xhk406srv&st=ylcbcfeh&dl=0&dl=1"
},
{
    "id": 1385969,
    "title": "Believe: The Ultimate Battle",
    "original_title": "Believe: Takdir, Mimpi, Keberanian",
    "overview": "Câu chuyện xoay quanh Agus, con trai của một cựu chiến binh, người lớn lên trong sự hỗn loạn và thiếu kỷ luật do bóng đen sự vắng mặt của cha để lại; khi người cha qua đời, Agus quyết định bước vào con đường quân ngũ, đối mặt với thử thách khắc nghiệt để trưởng thành, thấu hiểu di sản mà cha để lại và tìm thấy niềm tin cho chính cuộc đời mình.",
    "poster_path": "https://image.tmdb.org/t/p/w500/qP5wSoHngnDM1o6nzzUjv6CEiz5.jpg",
    "release_date": "2025-07-24",
    "vote_average": 5.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/3gjyls2och6pth5uuwysa/Believe.The.Ultimate.Battle.2025.1080p.NF.WEB-DL.DD5.1.H.264-playWEB-2.mkv?rlkey=eqw0ek3k2j8spkqhbdb3oktyc&st=yf3qeowd&dl=0&dl=1"
},
{
    "id": 9502,
    "title": "Kung Fu Gấu Trúc",
    "original_title": "Kung Fu Panda",
    "overview": "Khi kẻ xấu hùng mạnh phá hoại sự bình yên ở thung lũng của cậu, chú gấu trúc lười nhác đón nhận thử thách để đi theo định mệnh của mình – trở thành một võ hiệp.",
    "poster_path": "https://image.tmdb.org/t/p/w500/tfdrBWUU9geZULfRYty5J9EINvw.jpg",
    "release_date": "2008-06-04",
    "vote_average": 7.311,
    "dropbox_link": "https://www.dropbox.com/scl/fi/t56i82yrefnro0rhio4pf/Kung.Fu.Panda.2008.Vie.WEB-DL.1080p.DDP5.1.x264.mkv?rlkey=4mtm6k4szaylz6w782hipf0kt&st=cxxlqxdx&dl=0&dl=1"
},
{
    "id": 49444,
    "title": "Kung Fu Gấu Trúc 2",
    "original_title": "Kung Fu Panda 2",
    "overview": "Bụng no và sẵn sàng đánh đấm, Po dấn thân vào cuộc hành trình nguy hiểm cùng Ngũ Đại Hiệp để đối đầu với một kẻ thù mới đáng sợ và cứu nghệ thuật kungfu.",
    "poster_path": "https://image.tmdb.org/t/p/w500/fEpOEpKyz7SGelF73mHA27AgdF.jpg",
    "release_date": "2011-05-25",
    "vote_average": 7.054,
    "dropbox_link": "https://www.dropbox.com/scl/fi/zubun1tf5g924cxsjx7ak/Kung.Fu.Panda.2.2011.Vie.WEB-DL.1080p.DDP5.1.x264.mkv?rlkey=8zec2hvatf1a0qdsrf1a3uy9d&st=xhsr03mt&dl=0&dl=1"
},
{
    "id": 140300,
    "title": "Kung Fu Panda 3",
    "original_title": "Kung Fu Panda 3",
    "overview": "Trong khi Po và bố đến ngôi làng gấu trúc bí mật, một linh hồn xấu xa đe dọa toàn xứ Thần Châu, buộc cậu phải thành lập một đội quân bản xứ chắp vá.",
    "poster_path": "https://image.tmdb.org/t/p/w500/wmbbaf924GcYWZVbbyzZy8leJ1k.jpg",
    "release_date": "2016-01-23",
    "vote_average": 6.922,
    "dropbox_link": "https://www.dropbox.com/scl/fi/9wqo9rg96fzlc5y9h6wej/Kung.Fu.Panda.3.2016.VIE.DUB.Bluray.1080p.DD5.1.x264-L-ng-ti-ng.mkv?rlkey=zpjf2keuk47sajcgg43g5ic3h&st=mzjyb4n7&dl=0&dl=1"
},
{
    "id": 1011985,
    "title": "Kung Fu Panda 4",
    "original_title": "Kung Fu Panda 4",
    "overview": "Sau khi Po được chọn trở thành Thủ lĩnh tinh thần của Thung lũng Bình Yên, Po cần tìm và huấn luyện một Chiến binh Rồng mới, trong khi đó một mụ phù thủy độc ác lên kế hoạch triệu hồi lại tất cả những kẻ phản diện mà Po đã đánh bại về cõi linh hồn.",
    "poster_path": "https://image.tmdb.org/t/p/w500/7quq3UOaaB0qNM7TMGMEqqghLck.jpg",
    "release_date": "2024-03-02",
    "vote_average": 7.029,
    "dropbox_link": "https://www.dropbox.com/scl/fi/ftehwlut5mmoufr0atsu8/Kung.Fu.Panda.4.2024-ViE-1080p.AMZN.WEB-DL.DDP5.1.Atmos.H.264-FLUX.mkv?rlkey=d8z24abad7bsc2306o6pylq8r&st=mo8mmfmn&dl=0&dl=1"
},
{
    "id": 736526,
    "title": "Troll: Quỷ núi khổng lồ",
    "original_title": "Troll",
    "overview": "Khi một vụ nổ ở vùng núi Na Uy đánh thức con quỷ núi khổng lồ cổ đại, các quan chức chỉ định một nhà cổ sinh vật học gan góc ngăn chặn cuộc tàn phá chết chóc của nó.",
    "poster_path": "https://image.tmdb.org/t/p/w500/mchfYMnYpRSGMI2YlqDq9pAv1LV.jpg",
    "release_date": "2022-11-30",
    "vote_average": 6.583,
    "dropbox_link": "https://www.dropbox.com/scl/fi/phmkpdv60z3vp6kdikb96/Troll.2022.1080p.NF.WEB-DL.DUAL.DDP5.1.Atmos.H.264-SMURF-Sub-Viet.mkv?rlkey=2k5uf0yrffhkcicjyg592jxbk&st=7bcf6cut&dl=0&dl=1"
},
{
    "id": 628847,
    "title": "Báo Thủ Báo Nhà",
    "original_title": "Trap House",
    "overview": "Một đặc vụ DEA chìm và cộng sự của anh ta bắt đầu cuộc rượt đuổi mèo vờn chuột với một nhóm trộm táo tợn và đáng ngạc nhiên – chính là những đứa con tuổi teen nổi loạn của họ, những kẻ đã bắt đầu cướp bóc từ một băng đảng ma túy nguy hiểm, sử dụng chiến thuật và thông tin tình báo tối mật của cha mẹ chúng để thực hiện điều đó.",
    "poster_path": "https://image.tmdb.org/t/p/w500/e39G8lKvuyvWy7ZoeTMp6LnFJMG.jpg",
    "release_date": "2025-11-14",
    "vote_average": 6.306,
    "dropbox_link": "https://www.dropbox.com/scl/fi/9ih9uft93sxm4q7020rig/Trap.House.2025.1080p.AMZN.WEB-DL.DDP5.1.H.264-FLUX.mkv?rlkey=09cag7verki69ac51w9wlvdyv&st=1t9ye74i&dl=0&dl=1"
},
{
    "id": 1314754,
    "title": "Đường Mòn Báo Thù",
    "original_title": "Trail of Vengeance",
    "overview": "Lấy bối cảnh năm 1875, câu chuyện xoay quanh một góa phụ có cuộc sống bị đảo lộn sau khi chồng cô bị sát hại dưới kế hoạch tàn độc của một viên đại tá. Trong hành trình tìm công lý và trả thù, cô tình cờ gặp một cựu đặc vụ Pinkerton mang quá khứ đầy tổn thương, và cả hai cùng dấn thân vào hành trình đối đầu thế lực đen tối đứng sau tội ác.",
    "poster_path": "https://image.tmdb.org/t/p/w500/y6P0tUlkDw8Jc4BiuNKKw6KFjHU.jpg",
    "release_date": "2025-05-23",
    "vote_average": 3.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/41y1lm4fkcbwfg8be7r85/Trail-of-Vengeance-2025-ViE-Remux-1080p-GER-Blu-ray-AVC-DTS-HD-MA-5.1.mkv?rlkey=a2tc7k0cw79qacduzo2jlrsmu&st=pea5hn3v&dl=0&dl=1"
},
{
    "id": 273248,
    "title": "Tám Mối Hận",
    "original_title": "The Hateful Eight",
    "overview": "Nhiều năm sau Nội chiến, một thợ săn tiền thưởng và con tin của anh ta bị trận bão tuyết ở Wyoming cản bước. Họ bèn ẩn náu trong một nhà ga cùng sáu người lạ khó đoán và nguy hiểm.",
    "poster_path": "https://image.tmdb.org/t/p/w500/jft4NERh6O67KLLXX5MIIRkaGn9.jpg",
    "release_date": "2015-12-25",
    "vote_average": 7.756,
    "dropbox_link": "https://www.dropbox.com/scl/fi/ih5tsvdt72b0h5fez876k/The-Hateful-Eight-2015-1080p-BluRay-DTS-x264-TayTO.mkv?rlkey=jks58jfucmlvmifowc8uxszfk&st=54lxguf5&dl=0&dl=1"
},
{
    "id": 1242898,
    "title": "Quái Thú Vô Hình: Vùng Đất Chết Chóc",
    "original_title": "Predator: Badlands",
    "overview": "Trong tương lai, tại một hành tinh hẻo lánh, một Predator non nớt - kẻ bị chính tộc của mình ruồng bỏ - tìm thấy một đồng minh không ngờ tới là Thia và bắt đầu hành trình sinh tử nhằm truy tìm kẻ thù tối thượng. Bộ phim do Dan Trachtenberg - đạo diễn của Prey chỉ đạo và nằm trong chuỗi thương hiệu Quái Thú Vô Hình Predator.",
    "poster_path": "https://image.tmdb.org/t/p/w500/6aPy2tMgQLVz2IcifrL1Z2Q9u1t.jpg",
    "release_date": "2025-11-05",
    "vote_average": 7.4,
    "dropbox_link": "https://www.dropbox.com/scl/fi/pldr8yoki9kaj5tc2rict/Predator.Badlands.2025.ViE-1080p-WEB-DL-DDP.5.1.H265-ZAX.mkv?rlkey=vfs55aqx5429uex5hyczgncyj&st=ehrgaaub&dl=0&dl=1"
},
{
    "id": 479455,
    "title": "Đặc Vụ Áo Đen: Sứ Mệnh Toàn Cầu",
    "original_title": "Men in Black: International",
    "overview": "Những đặc vụ áo đen là người bảo vệ trái đất khỏi mối đe dọa từ các sinh vật ngoài hành tinh. Trong cuộc phiêu lưu mới này, nhiệm vụ của họ ngày càng trở nên nguy hiểm hơn khi phải đối đầu với một nội gián trong chính tổ chức của mình. Men In Black International là spin-off của siêu phẩm Men In Black nổi tiếng, do Chris Hemsworth, Tessa Thompson và Lian Neeson thủ vai chính.",
    "poster_path": "https://image.tmdb.org/t/p/w500/1xfLyWJhyDZATM4o3G04uepMQtF.jpg",
    "release_date": "2019-06-12",
    "vote_average": 5.9,
    "dropbox_link": "https://www.dropbox.com/scl/fi/ewkx33l8ryd9fbbpem1td/Men-in-Black-International-2019-ViE-AMZN-WEB-DL-1080p-DDP-5.1-H264-NTG.mkv?rlkey=qw2epx21ngimjaajegj90i1th&st=x8po07je&dl=0&dl=1"
},
{
    "id": 999075,
    "title": "Cô gái tay chiêu",
    "original_title": "左撇子女孩",
    "overview": "Một người mẹ và hai cô con gái chuyển đến Đài Bắc để mở một tiệm mì tại khu chợ đêm sôi động, song những bí mật gia đình và quan niệm truyền thống thử thách khởi đầu mới của họ.",
    "poster_path": "https://image.tmdb.org/t/p/w500/9RwFA1tHOpblukY0sBsW1AuNDnE.jpg",
    "release_date": "2025-09-17",
    "vote_average": 7.6,
    "dropbox_link": "https://www.dropbox.com/scl/fi/two9i3kj98rs4fnsrooz3/Left-Handed.Girl.2025.1080p.NF.WEB-DL.DDP5.1.H264-HHWEB-Sub-Viet.mkv?rlkey=zrzow2duzy2009b5ofvwpoirg&st=1y4mdgh1&dl=0&dl=1"
},
{
    "id": 1576166,
    "title": "Giá Như Cha Cho Con Biết",
    "original_title": "Sana Sinabi Mo",
    "overview": "Sau khi phát hiện bí mật giấu kín từ lâu của người cha quá cố, nhà truyền giáo trẻ nọ đi từ Philippines đến Tây Ban Nha để tìm kiếm mối tình bị cấm đoán của cha mình.",
    "poster_path": "https://image.tmdb.org/t/p/w500/qKuos4fGcntgeXXgR3NAmTU0kOU.jpg",
    "release_date": "2025-12-04",
    "vote_average": 7.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/tk9mmt8e5rpcxt8t5kgvz/I.Wish.You.Had.Told.Me.2025.1080p.NF.WEB-DL.DDP5.1.H264-HHWEB-Sub-Viet.mkv?rlkey=uppf36r7npa7g6pcmaxiy4xw3&st=w8a3bjd3&dl=0&dl=1"
},
{
    "id": 1396965,
    "title": "Thám Tử Lừng Danh Conan: Dư Ảnh Của Độc Nhãn",
    "original_title": "名探偵コナン 隻眼の残像（フラッシュバック）",
    "overview": "Thám Tử Lừng Danh Conan 28: Dư Ảnh Của Độc Nhãn – Trên những ngọn núi tuyết của Nagano, một vụ án bí ẩn đã đưa Conan và các thám tử quay trở lại quá khứ. Thanh tra Yamato Kansuke - người đã bị thương nặng trong một trận tuyết lở nhiều năm trước - bất ngờ phải đối mặt với những ký ức đau thương của mình trong khi điều tra một vụ tấn công tại Đài quan sát Nobeyama. Cùng lúc đó, Mori Kogoro nhận được một cuộc gọi từ một đồng nghiệp cũ, tiết lộ mối liên hệ đáng ngờ giữa anh ta và vụ án đã bị lãng quên từ lâu. Sự xuất hiện của Morofushi Takaaki, cùng với những nhân vật chủ chốt như Amuro Tooru, Kazami và cảnh sát Tokyo, càng làm phức tạp thêm cuộc điều tra. Khi quá khứ và hiện tại đan xen, một bí ẩn rùng rợn dần dần được hé lộ - và ký ức của Kansuke nắm giữ chìa khóa cho mọi thứ.",
    "poster_path": "https://image.tmdb.org/t/p/w500/8iuOKfhsRUoOLuufXWyK89HpIPC.jpg",
    "release_date": "2025-04-18",
    "vote_average": 7.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/3hbc4gtlepfvlbup0frb1/Detective.Conan.One-eyed.Flashback.2025.1080p.BluRay.DTS.x265.10bit-ADE-Sub-Viet.mkv?rlkey=bu8m4ez2qhklgev0zcazokpwc&st=xw73qpn0&dl=0&dl=1"
},
{
    "id": 517096,
    "title": "Quái Thú Sao Hỏa",
    "original_title": "Вратарь Галактики",
    "overview": "Quái thú sao hỏa - Cosmoball : Bộ phim lấy bối cảnh tương lai, hậu khải huyền ở một thành phố tại trái đất, khi mà cuộc chiến tranh giữa các thiên hà đã làm cho nơi này trở thành khô cằn và đầy bệnh dịch. Để cứu lấy trái đất, thủ lĩnh của hội Nghiên cứu của hội đồng ngân hà đã tạo một con tàu khổng lồ với hình dáng của một cây hoa bồ công anh, bên trong là một sân vận động lớn, để tổ chức các giải đấu Cosmoball, để chuẩn bị cho cuộc chiến với kẻ tội phạm nguy hiểm nhất dải ngân hà. Và những vận động viên cuối cùng cũng sẽ là những người bảo vệ cho người dân trái đất khi chẳng may chiến tranh nổ ra. Số phận của trái đất cũng phụ thuộc vào cuộc chiến cuối cùng này",
    "poster_path": "https://image.tmdb.org/t/p/w500/1AkgB1GoseuOB0i14uC185oqmCz.jpg",
    "release_date": "2020-08-27",
    "vote_average": 6.335,
    "dropbox_link": "https://www.dropbox.com/scl/fi/wdlmjq2di1gte4o6p7qx0/Cosmoball-2020-ViE-1080p-BluRay-Remux-AVC-DTS-HD-MA-5.1-MBH-Thuyet-Minh-Sub-Viet.mkv?rlkey=7xap7bwi8qj6j9o5oowz3tcdf&st=4q3n2kyu&dl=0&dl=1"
},
{
    "id": 198184,
    "title": "Chappie",
    "original_title": "Chappie",
    "overview": "Bộ phim Chappie xoay quanh câu chuyện về một chú robot của lực lượng cảnh sát Johannesburg, bị hỏng sau một trận đánh, Chappie được một nhà khoa học trẻ khôi phục lại và “thổi hồn” vào biến cậu thành khác biệt. Chappie có linh hồn, có tình cảm và có suy nghĩ như một con người. Ẩn trong vẻ ngoài lạnh lùng cứng nhắc của một robot cảnh sát, linh hồn Chappie non nớt và ngây thơ như một đứa trẻ. Và hơn bao giờ hết, cậu có một niềm thiết tha mãnh liệt với cuộc sống.",
    "poster_path": "https://image.tmdb.org/t/p/w500/hvLi76WpH1h5wTYu5dtQBtC9b29.jpg",
    "release_date": "2015-03-04",
    "vote_average": 6.786,
    "dropbox_link": "https://www.dropbox.com/scl/fi/v42gt7lv8vsregjicxllh/Chappie.2015.ViE.1080p.BluRay.DD7.1.x264-playHD-Vietsub-TM.mkv?rlkey=3y8bmadebxcqxs6r5v86729i4&st=ox00qkgg&dl=0&dl=1"
},
{
    "id": 484641,
    "title": "Sát Thủ Anna",
    "original_title": "Anna",
    "overview": "Với kỹ năng chiến đấu thiện nghệ cùng sắc đẹp khó cưỡng, 'chị đẹp' Anna khiến khán giả phải nghẹt thở khi chứng kiến những pha hành động 'cân cả thế giới' của mình.",
    "poster_path": "https://image.tmdb.org/t/p/w500/iuePVURusUkjwtrlOJCsgzo3EWG.jpg",
    "release_date": "2019-06-19",
    "vote_average": 6.707,
    "dropbox_link": "https://www.dropbox.com/scl/fi/kckfjm9ijut2in01nxrdx/Anna.2019.ViE.Hybrid.1080p.BluRay.DDP7.1.x264-prldm.mkv?rlkey=hl51aj34r76o27vsfzvazsost&st=x267ie66&dl=0&dl=1"
},
{
    "id": 592742,
    "title": "Cuộc Chơi Thân Xác",
    "original_title": "私の奴隷になりなさい 第2章 「ご主人様と呼ばせてください」",
    "overview": "Phim 'Be My Master' (2018) kể về Meguro, một nhà thiết kế quảng cáo đã có vợ nhưng lại vướng vào mối quan hệ ngoài luồng với Miyin, một người phụ nữ quyến rũ và bí ẩn. Khi một khách hàng lớn – đồng thời là giám đốc một công ty quảng cáo – xuất hiện và có liên quan đến Miyin, mọi chuyện trở nên phức tạp. Chồng của Miyin, Shanwei, biết chuyện nhưng lại ép Meguro tiếp tục mối quan hệ để giữ thể diện và địa vị xã hội. Phim khai thác sâu sắc những mâu thuẫn giữa tình yêu, đạo đức và danh vọng trong xã hội hiện đại.",
    "poster_path": "https://image.tmdb.org/t/p/w500/8b5t20EVVOpojz3LO11NifeiEWO.jpg",
    "release_date": "2018-09-29",
    "vote_average": 6.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/yvmk0erqt9jypsdlg3fhj/Be.My.Master.2018.BluRay.1080p.DTS-HDMA.5.1.x265.10bit-CHD-Vietsub-1.mkv?rlkey=wrhyj34std7je1kmg5eqlrf7a&st=pixejebo&dl=0&dl=1"
},
{
    "id": 1299655,
    "title": "Trăng Xanh",
    "original_title": "Blue Moon",
    "overview": "Đêm 31-3-.1943 tại Sardi’s, Lorenz Hart đối diện bóng tối trong chính mình, còn Richard Rodgers ăn mừng “Oklahoma!” làm rung chuyển Broadway. Một khoảnh khắc định mệnh của hai người cộng sự tri âm giữa hào quang và nỗi cô độc.",
    "poster_path": "https://image.tmdb.org/t/p/w500/dVU7SNc6dgStTVdtbPLQncWxsyZ.jpg",
    "release_date": "2025-10-17",
    "vote_average": 6.871,
    "dropbox_link": "https://www.dropbox.com/scl/fi/67z76do73jpwoo015cy46/Blue.Moon.2025.1080p.WEB.H264-SLOT.mkv?rlkey=o6f3q5ecobcnwgn62g4otlvhi&st=dk1122ep&dl=0&dl=1"
},
{
    "id": 1325697,
    "title": "Breed of Greed",
    "original_title": "Breed of Greed",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/31NpTFAZVsuxWEWv9XjVuRtqHX2.jpg",
    "release_date": "2025-09-26",
    "vote_average": 4.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/miqoqojzuw9kl23yx6knr/Breed.of.Greed.2025.1080p.AMZN.WEB-DL.DD5.1.H.264-playWEB.mkv?rlkey=9lr47jd8c35kjmq4sc9mqxnic&st=zz5d4gdf&dl=0&dl=1"
},
{
    "id": 1246049,
    "title": "Dracula: Bản Tình Ca Bất Diệt",
    "original_title": "Dracula",
    "overview": "Một hoàng tử tuyệt vọng biến thành Dracula và lang thang bất tận qua thời gian, sống chỉ vì lời hứa tìm lại tình yêu của đời mình.",
    "poster_path": "https://image.tmdb.org/t/p/w500/vevuZVvb72VrbDzHiz4D8Z8XuGF.jpg",
    "release_date": "2025-07-30",
    "vote_average": 7.11,
    "dropbox_link": "https://www.dropbox.com/scl/fi/5nvolu1mf26fm68jy46rz/Dracula.A.Love.Tale.2025.1080p.WEB.H264-SLOT.mkv?rlkey=lfjpu0wr3mox9f3bxcnlod9pg&st=jnps19o2&dl=0&dl=1"
},
{
    "id": 1519461,
    "title": "Para X Normal",
    "original_title": "Paraxnormal",
    "overview": "Bốn người bạn thời thơ ấu đoàn tụ tại quê nhà để cướp căn biệt thự bỏ hoang được đồn có vàng và tiền mặt giấu bên trong. Nhưng rốt cuộc họ lại phát hiện ra nơi này có thể bị ám.",
    "poster_path": "https://image.tmdb.org/t/p/w500/gN9vjWmS0bYmfP4gHpeW2q4YUa3.jpg",
    "release_date": "2025-08-28",
    "vote_average": 3,
    "dropbox_link": "https://www.dropbox.com/scl/fi/ehartk1ge2duyuf0kr4de/Para.X.Normal.2025.1080p.NF.WEB-DL.DDP5.1.H.264-KQRM-Sub-Viet.mkv?rlkey=awquf1nfz0qyuo7p1h32zkypd&st=qtuy3nz4&dl=0&dl=1"
},
{
    "id": 850439,
    "title": "Kẻ Bị Nguyền Rủa",
    "original_title": "The Damned",
    "overview": "Giữa mùa đông băng giá đầu thế kỷ 19 ở bờ biển Iceland, góa phụ Eva phải gánh vác trạm đánh cá trong cảnh thiếu ăn. Khi một con tàu đắm ngoài khơi, cô quyết định không cứu để giữ lại nguồn sống cho nhóm mình. Nhưng từ đó, tội lỗi và nỗi sợ bắt đầu gặm nhấm, biến những bóng hình ngoài kia thành ác quỷ trong trí óc – cho đến khi sự thật phơi …",
    "poster_path": "https://image.tmdb.org/t/p/w500/fAXDQny8kEquc1BImiQHhYMGSsW.jpg",
    "release_date": "2025-01-03",
    "vote_average": 6.129,
    "dropbox_link": "https://www.dropbox.com/scl/fi/pra67xlfkloqlglvib3m1/The.Dam.2025.1080p.NF.WEB-DL.DD5.1.H.264-playWEB.mkv?rlkey=5ej3qdk0xkzuwvoz09rr93nw7&st=mziinjeh&dl=0&dl=1"
},
{
    "id": 1477538,
    "title": "Timeless Tidings of Joy",
    "original_title": "Timeless Tidings of Joy",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/iHRLMwAtMR6rDZlheUmFwbjhCnN.jpg",
    "release_date": "2025-11-13",
    "vote_average": 7,
    "dropbox_link": "https://www.dropbox.com/scl/fi/mygcu812pieqggji4n33v/Timeless.Tidings.of.Joy.2025.1080p.AMZN.WEB-DL.DDP2.0.H.264-Kitsune.mkv?rlkey=evuq5pv7hfilt09880cth4i8r&st=y6sdnpbu&dl=0&dl=1"
},
{
    "id": 1448560,
    "title": "Wildcat",
    "original_title": "Wildcat",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/h893ImjM6Fsv5DFhKJdlZFZIJno.jpg",
    "release_date": "2025-11-19",
    "vote_average": 5.838,
    "dropbox_link": "https://www.dropbox.com/scl/fi/vbfnzdibnjlx7gb0zfveq/Wildcat.2025.1080p.WEB.h264-EDITH.mkv?rlkey=l2j7whh0i2d8icy04ryma81ni&st=95mqe0dq&dl=0&dl=1"
},
{
    "id": 533533,
    "title": "Trò Chơi Ảo Giác: Ares",
    "original_title": "TRON: Ares",
    "overview": "Một chương trình trí tuệ nhân tạo siêu việt mang tên Ares được gửi từ thế giới số vào thế giới thực trong một nhiệm vụ đầy nguy hiểm — đánh dấu lần đầu tiên nhân loại tiếp xúc trực tiếp với một thực thể A.I. sống động.",
    "poster_path": "https://image.tmdb.org/t/p/w500/lj7imLGAzI3zKvbJtPH01aYW9lU.jpg",
    "release_date": "2025-10-08",
    "vote_average": 6.529,
    "dropbox_link": "https://www.dropbox.com/scl/fi/zhobrv0ogma4t4i5rq1f8/Tron.Ares.2025.ViE.AI.1080p.RU-DCPRip.HEVC.10bit.Hybrid.Audio.TrueHD.5.1.DDP5.1.mkv?rlkey=q9np2ck09fj3luderz662wttu&st=ucvcwpwh&dl=0&dl=1"
},
{
    "id": 1330018,
    "title": "I'm Still Here",
    "original_title": "I'm Still Here",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/6OGmSX1cwIpHCTqENkp19kT2mtB.jpg",
    "release_date": "2024-08-19",
    "vote_average": 0,
    "dropbox_link": "https://www.dropbox.com/scl/fi/p3q28tg0yqwauh7d5a5vv/Im.Still.Here.2024.1080p.AMZN.WEB-DL.DDP5.1.H.264-BYNDR-Vietsub-1.mkv?rlkey=t7xkr7brjhn4ycy0dyccyvmhd&st=b81b2lbd&dl=0&dl=1"
},
{
    "id": 663442,
    "title": "Thần Thám Địch Nhân Kiệt",
    "original_title": "狄仁杰探案",
    "overview": "Trong triều đại của Hoàng hậu Wu, có một số cái chết kỳ lạ ở kinh đô Trường An. Tin đồn về vụ sát hại 'Bức tranh tường nữ thần bay' ở Đền Tử Đạo ngày càng trở nên trầm trọng hơn. Di Renjie được lệnh điều tra vụ án. Anh ta phá vỡ bí ẩn của bức tranh tường dựa trên đặc điểm của Bài giảng hoa, dẫn đến kẻ sát nhân, Li Luoyu. Ngay sau đó, Li Luoyu tự sát. Sau nhiều lần điều tra, cuối cùng Di cũng tìm ra kẻ sát nhân thực sự.",
    "poster_path": "https://image.tmdb.org/t/p/w500/cmLQpnDKIqNgfnZXeKh1cY70tVS.jpg",
    "release_date": "2020-01-12",
    "vote_average": 5.6,
    "dropbox_link": "https://www.dropbox.com/scl/fi/1kd0jdi1in8p7vn0hopju/Detection-Of-Di-Renjie-2020-ViE-1080P-WEBDL-x264-DD2.0-ThanThamDichNHanKiet.mkv?rlkey=rnv456zzv4i0dna85t592ag0i&st=u6n1w1u7&dl=0&dl=1"
},
{
    "id": 9952,
    "title": "Giải Cứu Lúc Bình Minh",
    "original_title": "Rescue Dawn",
    "overview": "Rescue Dawn (2006) có tựa đề tiếng Việt là Giải Cứu Lúc Bình Minh. Đây là một bộ phim chiến tranh - phiêu lưu do Werner Herzog đạo diễn, kể về hành trình sinh tồn của Dieter Dengler, một phi công Mỹ bị bắn rơi và bắt giữ trong Chiến tranh Việt Nam. Christian Bale vào vai Dengler, thể hiện sự kiên cường và quyết tâm của nhân vật khi phải đối mặt với điều kiện khắc nghiệt trong trại tù và tìm cách trốn thoát.",
    "poster_path": "https://image.tmdb.org/t/p/w500/ymPlV2ymUBSctfRzpehFOxFmJiS.jpg",
    "release_date": "2007-06-23",
    "vote_average": 7,
    "dropbox_link": "https://www.dropbox.com/scl/fi/3zmn7vobvg5o28roiqhek/Rescue.Dawn.2006.1080p.BluRay.DTS.x264-Skazhutin-Vietsub.mkv?rlkey=bhtd8cxa1tnx123m2m9swh0n7&st=l75noimn&dl=0&dl=1"
},
{
    "id": 1248226,
    "title": "Buổi Hẹn Chơi",
    "original_title": "Playdate",
    "overview": "Brian vừa bị đuổi việc. Anh trở thành một ông bố nội trợ. Anh nhận lời mời đi chơi cùng một ông bố nội trợ khác, hóa ra lại là một gã vô lại.",
    "poster_path": "https://image.tmdb.org/t/p/w500/dOOcOlW4nxolR4JD3VuFUFi0B0a.jpg",
    "release_date": "2025-11-05",
    "vote_average": 6.168,
    "dropbox_link": "https://www.dropbox.com/scl/fi/0i9gu7wz9qx7tbv803haa/Playdate.2025.1080p.AMZN.WEB-DL.DDP5.1.H.264-playWEB.mkv?rlkey=ze804q66nryf994fkrm4ajbs4&st=shmfdvh1&dl=0&dl=1"
},
{
    "id": 488616,
    "title": "Ngày Không Còn Mẹ",
    "original_title": "채비",
    "overview": "In-gyu bị thiểu năng trí tuệ. Mẹ anh, Ae-soon, chăm sóc anh và luôn cằn nhằn anh. Một ngày nọ, cô được chẩn đoán mắc bệnh ung thư giai đoạn cuối và chuẩn bị cho sự tự lập của con trai mình.",
    "poster_path": "https://image.tmdb.org/t/p/w500/5GfXdVVfBmYEhfB06dRSq2MAb6Q.jpg",
    "release_date": "2017-11-09",
    "vote_average": 7,
    "dropbox_link": "https://www.dropbox.com/scl/fi/u6jhm5gfgue6wu0dh17t4/The.Preparation.2017.ViE.1080p.TVING.WEB-DL.AAC2.0.H.264-PandaMoon-Vietsub-TM.mkv?rlkey=3yu67ms3x3fnwttbrtf13yx6h&st=itns0z2h&dl=0&dl=1"
},
{
    "id": 1425122,
    "title": "Muôn Kiểu Giáng Sinh Cùng Anh Em Nhà Jonas",
    "original_title": "A Very Jonas Christmas Movie",
    "overview": "Kevin, Nick và Joe Jonas phải đối mặt với hàng loạt rắc rối dở khóc dở cười khi họ chật vật tìm cách trở về New York từ London sao cho kịp đón Giáng Sinh cùng gia đình.",
    "poster_path": "https://image.tmdb.org/t/p/w500/kGLgaDrYWmTAdRFzGP5pBquRnhO.jpg",
    "release_date": "2025-11-10",
    "vote_average": 6.23,
    "dropbox_link": "https://www.dropbox.com/scl/fi/g26707436q84jc5j37my4/A.Very.Jonas.Christmas.Movie.2025.1080p.DSNP.WEB-DL.DD5.1.Atmos.H.264-playWEB.mkv?rlkey=9znez501e3j7lw2vo5klwqk3g&st=2s923whf&dl=0&dl=1"
},
{
    "id": 1388874,
    "title": "Boss Ma'am",
    "original_title": "Boss Ma'am",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/i2dtlAOk8OEFW8yM82h4Bp0BCUU.jpg",
    "release_date": "2024-11-26",
    "vote_average": 7.1,
    "dropbox_link": "https://www.dropbox.com/scl/fi/sbqg9f19e34a85wat34kn/Boss-Maam-2024-2160p-WEB-DL-AAC-x264-RSG.mkv?rlkey=0ax52srx8wq95k4bzdho7ff2l&st=v9in440a&dl=0&dl=1"
},
{
    "id": 14160,
    "title": "Vút Bay",
    "original_title": "Up",
    "overview": "Ông già Carl quyết hoàn thành chuyến đi ấp ủ cả đời tới Thác thiên đường bằng ngôi nhà kết hàng nghìn quả bóng bay. Ngay khi vừa 'cất cánh', ông phát hiện ra người đồng hành bất đắc dĩ: Cậu bé hướng đạo sinh Russell lắm mồm. Kể từ đây, cuộc phiêu lưu kì thú của 2 ông cháu diễn ra với biết bao bất ngờ cùng nguy hiểm rình rập...",
    "poster_path": "https://image.tmdb.org/t/p/w500/y8zhQBzsNt7cyLdYkOdPnzOL9Ez.jpg",
    "release_date": "2009-05-28",
    "vote_average": 7.96,
    "dropbox_link": "https://www.dropbox.com/scl/fi/r144d3eeff884kd2wwms5/Up.2009.REPACK.1080p.UHD.BluRay.DD7.1.DoVi.x265-c0kE.mkv?rlkey=2pcxhg8981mryoaoelvxdj9ke&st=3o68dlea&dl=0&dl=1"
},
{
    "id": 879600,
    "title": "The Black Book",
    "original_title": "The Black Book",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/j3J57RrKvOeGgbqtBzIvRTFF55Y.jpg",
    "release_date": "2021-07-07",
    "vote_average": 6.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/rtfx9i2omb8k2efh9s73q/The.Black.Book.2021.1080p.AMZN.WEB-DL.AAC2.0.H.264-EVO.mkv?rlkey=vg00eqmvolhx0k1nw5lankfvs&st=creaz2cs&dl=0&dl=1"
},
{
    "id": 840326,
    "title": "Sisu: Già Gân Báo Thù",
    "original_title": "Sisu",
    "overview": "Khi một cựu quân nhân phát hiện ra vàng ở vùng hoang dã Lapland cố gắng mang chiến lợi phẩm vào thành phố, những người lính Đức Quốc xã do một sĩ quan SS tàn bạo chỉ huy đã chiến đấu với anh ta.",
    "poster_path": "https://image.tmdb.org/t/p/w500/bUnhv3lAxVbXnPJ0N9fLVQ3m0zl.jpg",
    "release_date": "2022-09-09",
    "vote_average": 7.401,
    "dropbox_link": "https://www.dropbox.com/scl/fi/7tsz4qad2o5hozei77tzz/Sisu.2022.1080p.BluRay.DD5.1.x264-playHD_Vsub.mkv?rlkey=vis4ksiipp2gcm3dm51mylbyw&st=grfbyjhr&dl=0&dl=1"
},
{
    "id": 639988,
    "title": "Không Còn Lựa Chọn",
    "original_title": "어쩔수가없다",
    "overview": "Man Soo (Lee Byung Hun), một nhân viên văn phòng bỗng chốc bị sa thải khỏi một công ty mà anh đã gắn bó 25 năm, cuộc sống êm ấm vừa mới có được lại bị đảo ngược. Để chu toàn cho gia đình là vợ Mi Ri (Son Ye Jin) và hai con, người đàn ông này nhất quyết phải sinh tồn đến cùng, bao gồm cả việc nhận những nghề cực đoan nhất.",
    "poster_path": "https://image.tmdb.org/t/p/w500/9w7WGjQes0Cs0s4U3Qr09Tg1Sra.jpg",
    "release_date": "2025-09-24",
    "vote_average": 7.753,
    "dropbox_link": "https://www.dropbox.com/scl/fi/ehbfp32ws7gmxs9yw0wyd/No-Other-Choice-2025-.1080p.WEB-DL.H264.AAC-EMCEU.mkv?rlkey=7h1dda3hgausrqu26qs779qh5&st=elsyk9cg&dl=0&dl=1"
},
{
    "id": 675353,
    "title": "Nhím Sonic 2",
    "original_title": "Sonic the Hedgehog 2",
    "overview": "Chú nhím xanh được yêu thích nhất thế giới trở lại cho cuộc phiêu lưu ở cấp độ tiếp theo trong Nhím Sonic 2. Sau khi định cư ở Green Hills, Sonic háo hức chứng tỏ mình sở hữu điều cần thiết để trở thành anh hùng thực thụ. Thách thức cho cậu xuất hiện khi Tiến sĩ Robotnik trở lại, lần này cùng đối tác mới là Knuckles, với mục đích kiếm tìm viên ngọc lục bảo có sức mạnh hủy diệt các nền văn minh. Sonic hợp tác với người bạn Tails và họ cùng nhau trên hành trình khắp địa cầu nhằm tìm ra viên ngọc lục bảo trước khi nó rơi vào tay kẻ xấu.",
    "poster_path": "https://image.tmdb.org/t/p/w500/3eh7j7zVOc4ZRtOrduYnaWD9mYJ.jpg",
    "release_date": "2022-03-30",
    "vote_average": 7.4,
    "dropbox_link": "https://www.dropbox.com/scl/fi/62s2x42d8oz08dl1cidj0/Sonic.The.Hedgehog.2.2022.ViE.1080p.AMZN.WEB-DL.DDP5.1.H.264-LASTalfaHD.mkv?rlkey=lfg8nd7bctj0vcq72d9twg114&st=w7hyan8n&dl=0&dl=1"
},
{
    "id": 214340,
    "title": "Devil in the Flesh",
    "original_title": "Devil in the Flesh",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/8P4EHTCv9q0NpKOWq5rV9ANHtTn.jpg",
    "release_date": "1986-08-01",
    "vote_average": 2.833,
    "dropbox_link": "https://www.dropbox.com/scl/fi/lo9798esrvnv7nemsrnt0/Devil.in.the.Flesh.1986.1080p.BluRay.x264.DTS-WiKi.mkv?rlkey=hcgjgecbwjq1aeora5xfamnae&st=hgn1pjkb&dl=0&dl=1"
},
{
    "id": 1329643,
    "title": "Cuộc Đời Thứ 2",
    "original_title": "重见天日",
    "overview": "Trong nhà tù nữ, “Chiến thần” Lão Lương (do Nguyên Thu thủ vai) – người khiến ai cũng khiếp sợ, và A Quỷ (do Ngô Vĩnh Long thủ vai) – sát thủ mù lòa của băng Thanh Long từng một thời nổi tiếng, vô tình gặp lại nhau. Từ đó, giữa hai mẹ con tại một tiệm thuốc Đông y đã xảy ra một loạt những cuộc đấu trí, đấu sức đầy kịch tính. Một người là bậc thầy võ học Đông y, đã thất lạc con trai nhiều năm, luôn mong muốn yêu thương con bằng cách tốt nhất; người kia là một đứa trẻ mồ côi bị băng đảng bỏ rơi, nay đã quay về gia đình nhưng lại luôn tìm cách ám sát mẹ mình. Cả hai gặp lại nhau trong hoàn cảnh sai lầm, thời điểm sai lầm, dẫn đến hàng loạt các màn đối đầu võ thuật đỉnh cao, gây ra những tình huống dở khóc dở cười nhưng cũng đầy nhiệt huyết, cuối cùng tạo nên một mối duyên kỳ diệu về sự cứu rỗi lẫn nhau và cùng hoàn thiện lẫn nhau.",
    "poster_path": "https://image.tmdb.org/t/p/w500/eNuyQ2AbY7gITtelX36yVTYrWIH.jpg",
    "release_date": "2024-08-15",
    "vote_average": 7.667,
    "dropbox_link": "https://www.dropbox.com/scl/fi/jtq45hfjfmj3gsl1ts6l8/Second.Life.2024.2160p.WEB-DL.H265.EDR.DDP5.1-BATWEB-Vietsub.mkv?rlkey=9s0u0uarx8hx6lgbf1kcb1xns&st=ajhc86cp&dl=0&dl=1"
},
{
    "id": 1269732,
    "title": "Thần Điêu Đại Hiệp: Vấn Thế Gian",
    "original_title": "神雕侠侣：问世间",
    "overview": "Một bộ phim với mô típ có thể là quen thuộc với khán giả một bình cũ rượu mới. Câu chuyện xoay quanh mối tình giữa Dương Quá và Tiểu Long Nữ, hai nhân vật nổi tiếng trong thế giới võ hiệp Kim Dung. Dương Quá là một chàng trai mồ côi, tính tình ngang bướng, trải qua nhiều biến cố trong cuộc đời. Tiểu Long Nữ là một cô gái xinh đẹp, võ công cao cường, sống trong Cổ Mộ phái. Tình yêu của họ gặp phải nhiều trắc trở do những quy tắc hà khắc của võ lâm và sự khác biệt về thân phận.",
    "poster_path": "https://image.tmdb.org/t/p/w500/ev2Cd4sI4rXnbPESxt59R8LDuKK.jpg",
    "release_date": "2025-01-22",
    "vote_average": 6.6,
    "dropbox_link": "https://www.dropbox.com/scl/fi/6jhr8f7zq5piymwu863yo/Condor-Hero-2025.2160p.WEB-DL.DDP2.0.H.265-HHWEB.mkv?rlkey=8xg7fjnihbbrmc2vn4wjmc8hn&st=kckhffvy&dl=0&dl=1"
},
{
    "id": 1089654,
    "title": "Trường An Ba Vạn Dặm",
    "original_title": "长安三万里",
    "overview": "Lấy bối cảnh Trung Quốc thời nhà Đường, vài năm sau khi Loạn An Sử do An Lộc Sơn đứng đầu nổ ra. Đồng Quan bại trận, Cao Thích buộc phải rút quân trốn chạy khiến cho Trường An rơi vào thế khó, vua Đường Huyền Tông rời bỏ kinh đô. Trong bối cảnh lịch sử đầy khắc nghiệt đó, tình bạn giữa Cao Thích và Lý Bạch trở thành một giai thoại đáng để ngưỡng mộ và ca ngợi.",
    "poster_path": "https://image.tmdb.org/t/p/w500/7wxk8Ka5AGUIjCpEPg4vBOwSSul.jpg",
    "release_date": "2023-07-02",
    "vote_average": 7.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/mt9xccqkkawqg0mfndkcg/Chang.An.2023-ViE-Hybird.1080p.BluRay.DDP7.1.x264-PTer.mkv?rlkey=o0tyyfcdq319rlbihuo7z25l0&st=bkv713ol&dl=0&dl=1"
},
{
    "id": 695721,
    "title": "Đấu Trường Sinh Tử: Khúc Hát Của Chim Ca & Rắn Độc",
    "original_title": "The Hunger Games: The Ballad of Songbirds & Snakes",
    "overview": "Phần tiền truyện này theo chân Coriolanus Snow (Tom Blyth thủ vai) trẻ tuổi, chính là vị Tổng thống Snow sau này. Hiệu trưởng Casca Highbottom (do Peter Dinklage thủ vai) triệu tập tất cả mọi người cho Lễ chiêu quân lần thứ 10, và chuẩn bị lựa chọn vật tế từ 12 quận. Lúc này, Coriolanus Snow được chỉ định trở thành cố vấn cho trò chơi với vai trò là trợ giúp vật tế trong đấu trường và là cố vấn của Lucy Gray Baird (Rachel Zegler thủ vai).  Phần phim này sẽ hé lộ quá khứ của Tổng thống Snow thời trẻ, những sự kiện nguồn cơn dẫn Snow đến con đường trở thành thủ lĩnh độc tài của Panem thay vì là chàng thiếu niên lương thiện. Đến cuối cùng, khán giả mới có thể được biết ai sẽ là chim ca, hót lên một khúc hát của kẻ chiến thắng và ai là rắn độc thật sự.",
    "poster_path": "https://image.tmdb.org/t/p/w500/3I8he6xhfPW4yWQRVJOuREWSJzA.jpg",
    "release_date": "2023-11-15",
    "vote_average": 7.003,
    "dropbox_link": "https://www.dropbox.com/scl/fi/hwpyhbshscqjb2o9gxyl3/The-Hunger.Games.The.Ballad.of.Songbirds.and.Snakes.2023-ViE-1080p.AMZN.WEB-DL.DDP5.1.Atmos.H.264-FLUX.mkv?rlkey=5akmj1bpwn2up7rj1jz919ozh&st=u42dq1ng&dl=0&dl=1"
},
{
    "id": 1580234,
    "title": "Akin Ang Gabi",
    "original_title": "Akin Ang Gabi",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/oFqXF5GwmdFfLlv6bU98kT5hEes.jpg",
    "release_date": "2025-11-21",
    "vote_average": 6.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/9nimw7npsiuptj38v81py/Akin.Ang.Gabi.2025.2160p.VMX.WEB-DL.AAC.x264-RSG.mkv?rlkey=3z2poilzy4secefqakklrj3nf&st=kmq8iw1v&dl=0&dl=1"
},
{
    "id": 592831,
    "title": "Giấc Mộng Tân La Mã",
    "original_title": "Megalopolis",
    "overview": "Megalopolis (2024) xoay quanh thành phố New Rome, nơi diễn ra cuộc đấu tranh quyền lực giữa hai nhân vật đối lập. Cesar Catilina, một nghệ sĩ tài năng với khát vọng về một tương lai lý tưởng, và thị trưởng tham lam Franklyn Cicero, người bảo vệ quyền lợi của riêng mình. Julia Cicero, con gái của thị trưởng, bị giằng xé giữa lòng trung thành với cha và tình yêu dành cho Cesar. Phim hứa hẹn mang đến những xung đột gay gắt giữa lý tưởng và hiện thực, giữa tình yêu và trách nhiệm, trong bối cảnh một thành phố đứng trước bước ngoặt thay đổi lớn.",
    "poster_path": "https://image.tmdb.org/t/p/w500/8Sok3HNA3r1GHnK2lCytHyBz1A.jpg",
    "release_date": "2024-09-25",
    "vote_average": 5.171,
    "dropbox_link": "https://www.dropbox.com/scl/fi/4gdu0fklm3gffyiwxl0ey/Megalopolis-2024.1080p.BluRay.DDP.5.1.x264-hallowed.mkv?rlkey=66anyxg824m62wo1sc726w56s&st=bbks7jak&dl=0&dl=1"
},
{
    "id": 668461,
    "title": "Xứ Sở Mộng Mơ",
    "original_title": "Slumberland",
    "overview": "Đồng hành cùng kẻ bất kham đầy thu hút, một cô bé mồ côi táo bạo du hành qua vùng đất của những giấc mơ để tìm viên ngọc trai quý sẽ ban cho cô bé điều ước lớn nhất.",
    "poster_path": "https://image.tmdb.org/t/p/w500/jyI4Et4uKpBybyen5aROiGycXLG.jpg",
    "release_date": "2022-11-18",
    "vote_average": 7.3,
    "dropbox_link": "https://www.dropbox.com/scl/fi/iq7qpl4nbxrljqakswh1c/Slumberland.2022.1080p.NF.WEB-DL.DDP5.1.Atmos.H.264-SMURF.mkv?rlkey=v1q5p4pewm15cajri4k5fkdd6&st=j4ymbk1g&dl=0&dl=1"
},
{
    "id": 1407861,
    "title": "Quái Vật Đầm Lầy",
    "original_title": "The Bayou",
    "overview": "Kyle, một sinh viên sinh học vừa tốt nghiệp, cùng nhóm bạn của mình thực hiện chuyến đi đến Florida để rải tro cốt của người anh trai quá cố. Tuy nhiên, chuyến đi trở thành thảm họa khi chiếc máy bay nhỏ chở họ gặp sự cố và rơi xuống vùng đầm lầy hoang vu của Louisiana. Tại đây, họ phải đối mặt với mối đe dọa từ những con cá sấu bị biến đổi do tiếp xúc với chất hóa học từ một phòng thí nghiệm ma túy bị DEA triệt phá. Những con cá sấu này trở nên hung dữ và nguy hiểm hơn bao giờ hết, khiến cuộc chiến sinh tồn của nhóm người sống sót trở nên khốc liệt.",
    "poster_path": "https://image.tmdb.org/t/p/w500/sf6j1SbgDf7VTjL1MRq5MAQSOyE.jpg",
    "release_date": "2025-01-31",
    "vote_average": 5.562,
    "dropbox_link": "https://www.dropbox.com/scl/fi/6758xw8ofcscaogsv32j4/The.Bayou.2025.BluRay.1080p.DDP.5.1.x264-hallowed-Vietsub.mkv?rlkey=wxkfypbf8lq7u5k4wsvpqpanu&st=4lffdsxv&dl=0&dl=1"
},
{
    "id": 295693,
    "title": "Nhóc Trùm",
    "original_title": "The Boss Baby",
    "overview": "Một câu chuyện về sự xuất hiện của một em bé mới sinh tác động như thế nào đến một gia đình, được kể từ quan điểm của một người kể chuyện thú vị không đáng tin cậy, một đứa trẻ 7 tuổi cực kỳ giàu trí tưởng tượng tên là Tim.",
    "poster_path": "https://image.tmdb.org/t/p/w500/pqaoRPNgKR4a3vjSr5PnhXquD8I.jpg",
    "release_date": "2017-03-23",
    "vote_average": 6.456,
    "dropbox_link": "https://www.dropbox.com/scl/fi/s4euvgdjdvbx14zwlejka/The.Boss.Baby.2017.BluRay.1080p.DTS.3Audio.x264-CHD-1.mkv?rlkey=a9p9zkj9gg2ajgekxrq4k4wwj&st=h0gzkz7p&dl=0&dl=1"
},
{
    "id": 459151,
    "title": "Nhóc Trùm: Nối Nghiệp Gia Đình",
    "original_title": "The Boss Baby: Family Business",
    "overview": "Nhóc trùm Ted giờ đây đã trở thành một triệu phú nổi tiếng trong khi Tim lại có một cuộc sống đơn giản bên vợ anh Carol và hai cô con gái nhỏ yêu dấu. Mỗi mùa Giáng sinh tới, cả Tina và Tabitha đều mong được gặp chú Ted nhưng dường như hai anh em nhà Templeton nay đã không còn gần gũi như xưa. Nhưng bất ngờ thay khi Ted lại có màn tái xuất không thể hoành tráng hơn khi đáp thẳng máy bay trực thăng tới nhà Tim trước sự ngỡ ngàng của cả gia đình.",
    "poster_path": "https://image.tmdb.org/t/p/w500/vZbhUmUZ386bhApZ552SCocTqXJ.jpg",
    "release_date": "2021-07-01",
    "vote_average": 7.3,
    "dropbox_link": "https://www.dropbox.com/scl/fi/od8f52rrplwprcojord06/The-Boss-Baby-Family-Business-2021-ViE-1080p-PCOK-WEB-DL-DDP5.1-H.264-EVO-Thuyet-Minh-Sub-Viet.mkv?rlkey=24x1di7xeqb6pvbclftf6zeht&st=px6gadwo&dl=0&dl=1"
},
{
    "id": 549509,
    "title": "Giấc Mơ Mỹ",
    "original_title": "The Brutalist",
    "overview": "Phim ghi lại 30 năm cuộc đời của László Tóth (Adrien Brody), một kiến trúc sư người Do Thái gốc Hungary sống sót sau thảm họa diệt chủng Holocaust. Sau khi Thế chiến thứ hai kết thúc, ông di cư sang Hoa Kỳ cùng với vợ mình, Erzsébet (Felicity Jones) để trải nghiệm “giấc mơ Mỹ”. László ban đầu phải chịu đựng nghèo đói và sự sỉ nhục, nhưng anh sớm đạt được hợp đồng với một khách hàng bí ẩn và giàu có, Harrison Lee Van Buren, điều đó sẽ thay đổi cuộc đời anh.",
    "poster_path": "https://image.tmdb.org/t/p/w500/vP7Yd6couiAaw9jgMd5cjMRj3hQ.jpg",
    "release_date": "2024-12-20",
    "vote_average": 6.966,
    "dropbox_link": "https://www.dropbox.com/scl/fi/eqltjbcdmdn9x2itajq04/The.Brutalist.2024.1080p.AMZN.WEB-DL.DDP5.1.H.264-APEX.mkv?rlkey=hpgldkmvvhbwe9wc8r1d67ljk&st=djq93r8b&dl=0&dl=1"
},
{
    "id": 1241983,
    "title": "Giấc mơ xe lửa",
    "original_title": "Train Dreams",
    "overview": "Một phu đốn gỗ có cuộc đời thanh tao và bình dị khi anh trải qua tình yêu và mất mát trong thời đại có nhiều thay đổi to lớn ở nước Mỹ đầu thế kỷ 20.",
    "poster_path": "https://image.tmdb.org/t/p/w500/l3zS4YnpOi4usyEXGJMtxSqDDyb.jpg",
    "release_date": "2025-11-05",
    "vote_average": 7.352,
    "dropbox_link": "https://www.dropbox.com/scl/fi/j712pwdslvkij7t3p49gk/Train.Dreams.2025.1080p.NF.WEB-DL.DDP5.1.Atmos.H.264-FLUX-Sub-Viet.mkv?rlkey=grs4xg92xxcmiak3khanf8if0&st=a6ds1h9l&dl=0&dl=1"
},
{
    "id": 555604,
    "title": "Pinocchio của Guillermo del Toro",
    "original_title": "Guillermo del Toro's Pinocchio",
    "overview": "Guillermo del Toro, nhà làm phim đoạt giải Oscar, tái dựng câu chuyện kinh điển về con rối gỗ sống dậy trong câu chuyện nhạc kịch kiểu tĩnh vật đầy ấn tượng này.",
    "poster_path": "https://image.tmdb.org/t/p/w500/vx1u0uwxdlhV2MUzj4VlcMB0N6m.jpg",
    "release_date": "2022-11-09",
    "vote_average": 8.042,
    "dropbox_link": "https://www.dropbox.com/scl/fi/le34n03kgd8lydqxlw2g9/Guillermo.del.Toros.Pinocchio.2022.1080p.UHD.BluRay.DDP7.1.DoVi.HDR10.x265-c0kE.mkv?rlkey=idoiakwzr3av560929x9oixuk&st=aq31aqga&dl=0&dl=1"
},
{
    "id": 1126336,
    "title": "Bí Mật Sau Bữa Tiệc",
    "original_title": "Anniversary",
    "overview": "Trong bộ phim tâm lý đầy kịch tính này, một gia đình gắn bó khăng khít bất ngờ bị cuốn vào vòng xoáy của phong trào xã hội gây nhiều tranh cãi mang tên “Sự Thay Đổi”. Ellen và Paul (Diane Lane và Kyle Chandler) phải đối diện với biến cố khi Liz (Phoebe Dynevor) – cựu học trò của Ellen – bất ngờ trở lại và nảy sinh quan hệ tình cảm với con trai họ (Dylan O’Brien). Sự hiện diện của Liz trong gia đình Taylor nhanh chóng làm gia tăng căng thẳng và thử thách các mối quan hệ vốn mong manh. Khi vai trò của Liz trong “Sự Thay Đổi” ngày càng rõ rệt, những mâu thuẫn âm ỉ dần bùng phát, đe dọa phá vỡ sự gắn kết của gia đình, trong bối cảnh cả quốc gia đang chao đảo trước thời kỳ đầy bất ổn và lo âu.",
    "poster_path": "https://image.tmdb.org/t/p/w500/tCLn5DyGjRwZiSX4ABCxpZS4QvM.jpg",
    "release_date": "2025-10-29",
    "vote_average": 6.9,
    "dropbox_link": "https://www.dropbox.com/scl/fi/2pe52cbbtoq8ybmnanucy/Anniversary.2025.1080p.iT.WEB-DL.DDP5.1.Atmos.H.264-FLUX.mkv?rlkey=um9txsgbs53t6gtrl5x0axxi8&st=l71jupo6&dl=0&dl=1"
},
{
    "id": 1265063,
    "title": "Sau Cuộc Săn Lùng",
    "original_title": "After the Hunt",
    "overview": "Một nữ giáo sư đại học rơi vào ngã rẽ cá nhân lẫn nghề nghiệp khi một sinh viên xuất sắc tố cáo một đồng nghiệp của cô, trong lúc một bí mật đen tối từ quá khứ của chính cô cũng có nguy cơ bị phơi bày.",
    "poster_path": "https://image.tmdb.org/t/p/w500/ryF8QPGUGlo8gRB4OYKb4J0r3aJ.jpg",
    "release_date": "2025-10-09",
    "vote_average": 5.815,
    "dropbox_link": "https://www.dropbox.com/scl/fi/bkz8cuquz8ocsvzwzocbx/After.The.Hunt.2025.1080p.AMZN.WEB-DL.DDP5.1.Atmos.H.264-playWEB.mkv?rlkey=kbm2at2wondhf828woz8fqi9j&st=juul584p&dl=0&dl=1"
},
{
    "id": 383498,
    "title": "Deadpool 2",
    "original_title": "Deadpool 2",
    "overview": "Trong phần 2 Deadpool sẽ đối đầu với sát nhân Cable, một kẻ đến từ tương lai với âm mưu giết hại một đứa bé – Người mà theo hắn sau này sẽ trở thành một dị nhân đầy quyền năng. Với nỗ lực đảm bảo sự an toàn cho đứa bé, Deadpool sẽ nhận được sự giúp đỡ từ cả những người bạn mới và cũ, và đặc biệt là các thành viên từ một đội quân mới thành lập có tên X-Force",
    "poster_path": "https://image.tmdb.org/t/p/w500/l0OdqQ9z12GGckRP8cmCcVfoflF.jpg",
    "release_date": "2018-05-15",
    "vote_average": 7.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/iqg936y80la8u23uh4p25/Deadpool.2.2018.Super.Duper.Cut.1080p.BluRay.x264.DTS-WiKi.mkv?rlkey=egus55eo5dxxwqjec47zohj6s&st=w1kjr53u&dl=0&dl=1"
},
{
    "id": 1029281,
    "title": "Strange Darling",
    "original_title": "Strange Darling",
    "overview": "Đây là phim thể loại giật gân biến thái đến kinh dị hay nhất mình từng xem trong năm nay, phải nói là quá hay. Cô ấy hiền lành đến ngỡ ngàng, phim đi từ bất ngờ đến bất ngờ.",
    "poster_path": "https://image.tmdb.org/t/p/w500/kWNCRgt3ocv19bYO0sk7TRuZuFY.jpg",
    "release_date": "2024-08-14",
    "vote_average": 6.9,
    "dropbox_link": "https://www.dropbox.com/scl/fi/vzhppensz6b2oyoxwvgnc/Strange.Darling.2023.1080p.AMZN.WEB-DL.DDP5.1.H.264-FLUX.mkv?rlkey=t1kydlbd8numh3pcnpbjpq48p&st=vfpgufxb&dl=0&dl=1"
},
{
    "id": 38199,
    "title": "Vụ Khủng Bố Không Tưởng",
    "original_title": "Unthinkable",
    "overview": "Unthinkable lấy bối cảnh nước Mỹ bị đe dọa bởi 3 quả bom nguyên tử được giấu ở 3 thành phố lớn. 3 quả bom được hẹn giờ cho nổ vào thứ Sáu. Thủ phạm đã bị bắt vào thứ Tư. Và việc tiếp theo, là buộc thủ phạm nói ra nơi giấu 3 quả bom. Nội dung phim xoay quanh việc tra hỏi thủ phạm để tìm ra vị trí 3 quả bom. Trong phim, khi đối diện với kẻ thù, nước Mỹ đã từng bước từng bước phải từ bỏ các giá trị về nhân quyền của mình, những giá trị Mỹ, điều làm nên nền tảng của Giấc Mơ Mỹ. Những giá trị về nhân quyền, về thượng tôn pháp luật, những điều mà Mỹ tự hào dường như bị chính nước Mỹ chối bỏ khi phải đối mặt với nguy hiểm.",
    "poster_path": "https://image.tmdb.org/t/p/w500/6yQqguytl10FhImngDHV90Aqewa.jpg",
    "release_date": "2010-05-26",
    "vote_average": 6.801,
    "dropbox_link": "https://www.dropbox.com/scl/fi/c6yh330p4ldehvnn470u8/Unthinkable.2010.Extended.mHD.BluRay.DD5.1.x264-c0kE.mkv?rlkey=25jc3e1pvu1ifyy5ebyarz08h&st=z6aqaczl&dl=0&dl=1"
},
{
    "id": 1299209,
    "title": "Con trai của ngàn người cha",
    "original_title": "O Filho de Mil Homens",
    "overview": "Ở một ngôi làng nhỏ, ngư dân cô đơn nọ khao khát có một đứa con trai rồi bị thứ ánh sáng siêu nhiên thu hút, kết nối anh với những người khác và bí mật chôn giấu từ lâu của họ.",
    "poster_path": "https://image.tmdb.org/t/p/w500/tJ4w5lgD2mA9jVNRJrion9IPdcQ.jpg",
    "release_date": "2025-10-30",
    "vote_average": 7.231,
    "dropbox_link": "https://www.dropbox.com/scl/fi/wk1jumwj45ku2xc7xpz64/The.Son.of.a.Thousand.Men.2025.1080p.NF.WEB-DL.DUAL.DDP5.1.Atmos.H.264-FLUX-Sub-Viet.mkv?rlkey=9200qsjnihltwfrak6pxyrhmn&st=zdstus1j&dl=0&dl=1"
},
{
    "id": 1029575,
    "title": "Kế Hoạch Bảo Vệ Gia Đình - The Family Plan",
    "original_title": "The Family Plan",
    "overview": "Dan Morgan là người toàn diện: một người chồng tận tụy, một người cha yêu thương, một nhân viên bán xe tiếng tăm. Anh cũng là một cựu sát thủ. Và khi những rắc rối quá khứ trở lại ám ảnh hiện tại, anh buộc phải đưa gia đình không mảy may nghi ngờ của mình vào một cuộc hành trình chưa từng có..",
    "poster_path": "https://image.tmdb.org/t/p/w500/2r0nLLGFxXfKd8oRb4PWoy35osn.jpg",
    "release_date": "2023-12-14",
    "vote_average": 7.25,
    "dropbox_link": "The.Family.Plan.2023.1080p.ATVP.WEB-DL.DDP5.1.Atmos.H.264-FLUX (Sub Viet).mkv?dl=1"
},
{
    "id": 13474,
    "title": "P2",
    "original_title": "P2",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/3mTtQSKoFNyvhbcqBUJl8tPRqMz.jpg",
    "release_date": "2007-11-09",
    "vote_average": 6.2,
    "dropbox_link": "https://www.dropbox.com/scl/fi/t0ds3hue6h13xbb4u5yvj/P2.2007.1080p.BluRay.DTS.x264-playHD-Vietsub.mkv?rlkey=96wk6dpvf644z5frngg1hqzd5&st=yeg44nvj&dl=0&dl=1"
},
{
    "id": 1148652,
    "title": "Di Sản Lính Cứu Hỏa",
    "original_title": "Legasi: Bomba the Movie",
    "overview": "Đang vật lộn với cái chết của thầy mình, viên lính cứu hỏa nọ phải mạnh mẽ lãnh đạo đội trong nhiệm vụ giải cứu khi một tòa nhà chọc trời bốc cháy.",
    "poster_path": "https://image.tmdb.org/t/p/w500/cYpOgJES148YUEAJMkJFmfQoT78.jpg",
    "release_date": "2025-08-21",
    "vote_average": 5.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/vbf1t2fux78cqtb685ms8/Legasi.Bomba.the.Movie.2025.1080p.NF.WEB-DL.DUAL.DDP5.1.H.264-ZYOZYO-Sub-Viet.mkv?rlkey=gqzmja4l33tmbruh56dkcj2cy&st=uuh62jlw&dl=0&dl=1"
},
{
    "id": 1364635,
    "title": "Hele Vejen",
    "original_title": "Hele Vejen",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/5NVgPBbu7yTRtNCaRUvGGISsyxw.jpg",
    "release_date": "2025-03-18",
    "vote_average": 6.3,
    "dropbox_link": "https://www.dropbox.com/scl/fi/h2q6k5tripdltnzjekid4/Hele.vejen.2025.1080p.BluRay.DD5.1.x264-SbR.mkv?rlkey=daouulv4d82gsxjkdtgdxe88x&st=1in1qyxl&dl=0&dl=1"
},
];
